import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  testId?: string;
  questionCount?: number;
  diagnostics?: Record<string, unknown>;
};

const respond = (data: ApiResponse) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  duration: z.number().int().min(5).max(600),
  correctMarks: z.number().positive().max(100).optional().default(4),
  wrongMarks: z.number().min(-100).max(0).optional().default(-1),
  filePath: z.string().min(1),
  answerKeyFilePath: z.string().nullable().optional(),
  isAdminUpload: z.boolean().optional().default(false),
  examType: z.string().trim().min(1).max(50).nullable().optional(),
  subject: z.string().trim().min(1).max(100).nullable().optional(),
});

const VALID = new Set(["A", "B", "C", "D"]);

function cleanCorrectAnswer(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const map: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "0": "A" };
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (VALID.has(upper)) return upper;
  if (map[raw]) return map[raw];
  // First letter A-D anywhere
  const m = upper.match(/[ABCD]/);
  return m ? m[0] : null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

const cleanAiJson = (content: string) =>
  content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

function getDayWindow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-");
  const start = new Date(`${y}-${m}-${d}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString(), label: `${y}-${m}-${d}` };
}

async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCharCounts: number[] }> {
  try {
    const pdfjsLib = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];
    const pageCharCounts: number[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const t = tc.items.map((it: { str?: string }) => it.str ?? "").join(" ").replace(/\s+/g, " ").trim();
      pageTexts.push(t);
      pageCharCounts.push(t.length);
    }
    return { text: pageTexts.join("\n\n"), pageCharCounts };
  } catch (e) {
    console.error("pdfjs extraction failed:", e);
    return { text: "", pageCharCounts: [] };
  }
}

async function extractAnswerKeyText(bytes: Uint8Array, filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return (await extractPdfText(bytes)).text;
  return new TextDecoder().decode(bytes);
}

const BASE_PROMPT = `You are an exam question extractor. Extract every MCQ question from this content. Return ONLY a raw JSON array. No markdown, no explanation, no code blocks. Each object must have exactly these fields: questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer, imageUrl. If correct answer is not visible, set correctAnswer to null. If a question refers to a graph, figure, diagram or image, set imageUrl to "GRAPH_PRESENT". Otherwise set imageUrl to null. Do not include anything outside the JSON array.

For all mathematical expressions use these rules strictly: Write fractions as (numerator)/(denominator) for example 1/x, 2/3, (x+1)/(x-1). Write exponents as x^2, x^3, x^n. Write square root as sqrt(x). Write subscripts as x_1, x_2. Preserve all brackets ( ) [ ] { } exactly. Never remove or simplify any mathematical symbol. Greek letters: write alpha, beta, theta, pi etc as their actual symbols α β θ π.`;

const ANSWER_KEY_PROMPT = `This is an answer key. Extract question numbers and their correct answers. Return ONLY a raw JSON object where keys are question numbers as strings and values are the correct answer as A, B, C, or D. Example: {"1":"A","2":"C"}. Apply these conversions: 0=A, 1=B, 2=C, 3=D or match directly if already A/B/C/D. No explanation, no markdown.`;

const MODEL_CANDIDATES = ["gemini-1.5-flash-latest", "gemini-1.5-flash-002", "gemini-2.5-flash"];

async function geminiCall(apiKey: string, model: string, parts: any[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, maxOutputTokens: 32768 } }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    const errText = await resp.text();
    console.error(`Gemini error ${model} attempt ${attempt + 1}:`, resp.status, errText.slice(0, 300));
    if (resp.status === 404) throw Object.assign(new Error("MODEL_UNAVAILABLE"), { code: 404 });
    if (resp.status >= 500 || resp.status === 429) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw new Error("AI is busy right now. Please wait 2 minutes and try again.");
    }
    throw new Error(`Gemini API error: ${resp.status}`);
  }
  throw new Error("AI is busy right now. Please wait 2 minutes and try again.");
}

async function geminiCallWithFallback(apiKey: string, parts: any[]): Promise<{ text: string; model: string }> {
  let lastError: any = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const text = await geminiCall(apiKey, model, parts);
      return { text, model };
    } catch (e: any) {
      lastError = e;
      if (e?.code === 404) continue;
      throw e;
    }
  }
  throw lastError || new Error("No supported Gemini model is currently available.");
}

function chunkText(input: string, maxLen = 3000): string[] {
  if (!input) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    let end = Math.min(i + maxLen, input.length);
    if (end < input.length) {
      const lastBreak = input.lastIndexOf("\n", end);
      if (lastBreak > i + 500) end = lastBreak;
    }
    chunks.push(input.slice(i, end));
    i = end;
  }
  return chunks;
}

function parseJsonArray(raw: string): any[] {
  const cleaned = cleanAiJson(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
  }
  return [];
}

function parseJsonObject(raw: string): Record<string, string> {
  const cleaned = cleanAiJson(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
  }
  return {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ ok: false, error: "Missing authorization header" });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return respond({ ok: false, error: "Invalid PDF processing request" });
    }
    const { title, duration, correctMarks, wrongMarks, filePath, answerKeyFilePath, isAdminUpload, examType, subject } = parsed.data;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!GEMINI_API_KEY) return respond({ ok: false, error: "GEMINI_API_KEY not configured on server" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return respond({ ok: false, error: "Invalid user session" });
    const userId = authData.user.id;

    const { data: isAdminFlag } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const isAdmin = !!isAdminFlag;

    if (isAdminUpload && !isAdmin) {
      return respond({ ok: false, error: "Only admins can upload official tests" });
    }

    if (!isAdmin) {
      const dayWindow = getDayWindow();
      const { count } = await supabase
        .from("pdf_conversions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("converted_at", dayWindow.startIso)
        .lt("converted_at", dayWindow.endIso);
      if ((count ?? 0) >= 3) {
        return respond({
          ok: false,
          error: "Daily limit reached. Try again tomorrow.",
          diagnostics: { resetTimeZone: "Asia/Kolkata", resetDate: dayWindow.label },
        });
      }
    }

    const { data: fileData, error: dlErr } = await supabase.storage.from("test-pdfs").download(filePath);
    if (dlErr) return respond({ ok: false, error: `Failed to download PDF: ${dlErr.message}` });
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    if (pdfBytes.length > 20 * 1024 * 1024) {
      return respond({ ok: false, error: "PDF file is too large (max 20MB)." });
    }

    const { text: extractedText, pageCharCounts } = await extractPdfText(pdfBytes);
    const isScanned = pageCharCounts.length === 0 || pageCharCounts.some((c) => c < 50);
    const hasGoodText = extractedText.length > 200;

    let answerKeyText: string | null = null;
    if (answerKeyFilePath) {
      const { data: akData, error: akErr } = await supabase.storage.from("test-pdfs").download(answerKeyFilePath);
      if (!akErr && akData) {
        const akBytes = new Uint8Array(await akData.arrayBuffer());
        answerKeyText = await extractAnswerKeyText(akBytes, answerKeyFilePath);
      }
    }

    let allQuestions: any[] = [];
    let usedModel = "";

    if (hasGoodText) {
      const chunks = chunkText(extractedText, 3000);
      for (const chunk of chunks) {
        const parts: any[] = [{ text: BASE_PROMPT }, { text: `\n\nCHUNK:\n${chunk}` }];
        try {
          const { text, model } = await geminiCallWithFallback(GEMINI_API_KEY, parts);
          usedModel = model;
          const arr = parseJsonArray(text);
          allQuestions.push(...arr);
        } catch (e: any) {
          console.error("Chunk extraction failed:", e?.message);
          if (String(e?.message || "").includes("AI is busy")) {
            return respond({ ok: false, error: e.message });
          }
        }
      }
    }

    if (allQuestions.length === 0 || isScanned) {
      const parts: any[] = [
        { text: BASE_PROMPT },
        { inlineData: { mimeType: "application/pdf", data: toBase64(pdfBytes) } },
      ];
      try {
        const { text, model } = await geminiCallWithFallback(GEMINI_API_KEY, parts);
        usedModel = model;
        const arr = parseJsonArray(text);
        allQuestions.push(...arr);
      } catch (e: any) {
        if (allQuestions.length === 0) {
          return respond({ ok: false, error: e?.message || "Could not extract questions from this PDF." });
        }
      }
    }

    // Deduplicate by questionNumber
    const dedup = new Map<number, any>();
    allQuestions.forEach((q, idx) => {
      const num = Number(q?.questionNumber ?? q?.question_number ?? idx + 1);
      if (!dedup.has(num)) dedup.set(num, q);
    });
    const merged = Array.from(dedup.values()).sort(
      (a, b) => Number(a.questionNumber || 0) - Number(b.questionNumber || 0),
    );

    if (merged.length === 0) {
      return respond({ ok: false, error: "No questions could be extracted from this PDF." });
    }

    // Answer key override
    let answerKeyMap: Record<string, string> = {};
    if (answerKeyText && answerKeyText.trim().length > 10) {
      try {
        const parts: any[] = [{ text: ANSWER_KEY_PROMPT }, { text: `\n\nANSWER KEY:\n${answerKeyText.slice(0, 20000)}` }];
        const { text } = await geminiCallWithFallback(GEMINI_API_KEY, parts);
        const obj = parseJsonObject(text);
        for (const [k, v] of Object.entries(obj)) {
          const cleaned = cleanCorrectAnswer(v);
          if (cleaned) answerKeyMap[String(k).trim()] = cleaned;
        }
      } catch (e) {
        console.error("Answer key parse failed:", e);
      }
    }

    const questions = merged
      .map((q: any, idx: number) => {
        const qNum = Number(q.questionNumber || q.question_number || idx + 1);
        const fromKey = answerKeyMap[String(qNum)];
        const cleaned = cleanCorrectAnswer(fromKey ?? q.correctAnswer ?? q.correct_answer);
        const rawImg = (q.imageUrl ?? q.image_url ?? null);
        const imgFlag = rawImg && String(rawImg).toUpperCase().includes("GRAPH_PRESENT");
        return {
          question_number: qNum,
          question_text: String(q.questionText || q.question_text || "").trim(),
          option_a: String(q.optionA || q.option_a || "").trim(),
          option_b: String(q.optionB || q.option_b || "").trim(),
          option_c: String(q.optionC || q.option_c || "").trim(),
          option_d: String(q.optionD || q.option_d || "").trim(),
          correct_answer: cleaned,
          image_url: imgFlag ? "GRAPH_PRESENT" : null,
        };
      })
      .filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);

    if (!questions.length) {
      return respond({ ok: false, error: "Questions were found but none had valid format." });
    }

    const totalMarks = questions.length * correctMarks;
    const { data: test, error: testError } = await supabase
      .from("tests")
      .insert({
        title,
        description: `Extracted from uploaded PDF (${questions.length} questions)`,
        test_type: isAdminUpload ? "admin_uploaded" : "user_custom",
        exam_type: examType || null,
        subject: subject || null,
        duration_minutes: duration,
        total_marks: totalMarks,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        unattempted_marks: 0,
        created_by: userId,
        is_published: isAdminUpload,
        pdf_url: filePath,
      })
      .select()
      .single();
    if (testError) return respond({ ok: false, error: `Failed to create test: ${testError.message}` });

    const rows = questions.map((q, idx) => ({
      test_id: test.id,
      question_number: idx + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer || "A",
      explanation: "",
      subject: subject || null,
      topic: null,
      difficulty: "medium",
      image_url: q.image_url,
    }));
    const { error: insErr } = await supabase.from("test_questions").insert(rows);
    if (insErr) return respond({ ok: false, error: `Failed to insert questions: ${insErr.message}` });

    if (!isAdmin) {
      await supabase.from("pdf_conversions").insert({ user_id: userId });
    }

    const diagramCount = questions.filter((q) => q.image_url).length;
    return respond({
      ok: true,
      testId: test.id,
      questionCount: questions.length,
      message: `✅ ${questions.length} questions extracted from ${pageCharCounts.length || "the"} pages`,
      diagnostics: {
        usedModel,
        scannedPdf: isScanned,
        extractedTextLength: extractedText.length,
        pageCount: pageCharCounts.length,
        diagramQuestions: diagramCount,
        answerKeyApplied: Object.keys(answerKeyMap).length,
      },
    });
  } catch (e: any) {
    console.error("Edge function error:", e);
    return respond({ ok: false, error: e?.message || "An unexpected error occurred during PDF processing." });
  }
});