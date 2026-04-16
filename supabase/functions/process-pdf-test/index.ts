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

function respond(data: ApiResponse) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const cleanAiJson = (content: string) =>
  content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

function estimateQuestionCount(sourceText: string): number | null {
  const seen = new Set<number>();
  const regex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d{1,3})[\.:\)]/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sourceText)) !== null) {
    const num = Number(match[1]);
    if (!Number.isNaN(num)) seen.add(num);
  }

  return seen.size > 0 ? seen.size : null;
}

function getDayWindow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [year, month, day] = formatter.format(now).split("-");
  const start = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: `${year}-${month}-${day}`,
  };
}

async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pageCharCounts: number[] }> {
  try {
    const pdfjsLib = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];
    const pageCharCounts: number[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push(text);
      pageCharCounts.push(text.length);
    }

    return { text: pageTexts.join("\n\n"), pageCharCounts };
  } catch (error) {
    console.error("pdfjs extraction failed:", error);
    return { text: "", pageCharCounts: [] };
  }
}

async function extractAnswerKeyText(bytes: Uint8Array, filePath: string): Promise<string> {
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (extension === "pdf") {
    const result = await extractPdfText(bytes);
    return result.text;
  }
  return new TextDecoder().decode(bytes);
}

const EXTRACTION_PROMPT = `You are an exam question extractor. Extract every MCQ question from this content. Return ONLY a raw JSON array. No markdown, no explanation, no code blocks. Each object must have exactly these fields: questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer. If correct answer is not visible, set correctAnswer to null. Do not include anything outside the JSON array.`;

async function callGemini(
  apiKey: string,
  textContent: string | null,
  pdfBase64: string | null,
  answerKeyText: string | null,
): Promise<{ questions: any[]; model: string }> {
  const modelCandidates = ["gemini-1.5-flash-latest", "gemini-1.5-flash-002", "gemini-2.5-flash"];
  const parts: any[] = [];

  let fullPrompt = EXTRACTION_PROMPT;
  if (answerKeyText) {
    fullPrompt += `\n\nANSWER KEY:\n${answerKeyText.slice(0, 20000)}`;
  }
  parts.push({ text: fullPrompt });

  if (textContent && textContent.length > 200) {
    parts.push({ text: `\n\nEXTRACTED TEXT FROM PDF:\n${textContent.slice(0, 100000)}` });
  }

  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    });
  }

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 32768,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${model}):`, response.status, errorText);
      if (response.status === 404) {
        lastError = new Error(`Gemini model ${model} is unavailable.`);
        continue;
      }
      throw new Error(`Gemini API error: ${response.status} - ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = cleanAiJson(rawContent);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Could not parse Gemini response as JSON");
      }
    }

    const questions = Array.isArray(parsed) ? parsed : parsed?.questions || [];
    return { questions, model };
  }

  throw lastError || new Error("No supported Gemini model is currently available.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ ok: false, error: "Missing authorization header" });

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return respond({ ok: false, error: "Invalid PDF processing request", diagnostics: parsedBody.error.flatten().fieldErrors as Record<string, unknown> });
    }

    const { title, duration, correctMarks, wrongMarks, filePath, answerKeyFilePath, isAdminUpload, examType, subject } = parsedBody.data;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!GEMINI_API_KEY) {
      return respond({ ok: false, error: "GEMINI_API_KEY not configured on server" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return respond({ ok: false, error: "Invalid user session" });

    const userId = authData.user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    if (isAdminUpload && !isAdmin) {
      return respond({ ok: false, error: "Only admins can upload official tests" });
    }

    if (!isAdmin) {
      const dayWindow = getDayWindow();
      const { count, error: countError } = await supabase
        .from("pdf_conversions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("converted_at", dayWindow.startIso)
        .lt("converted_at", dayWindow.endIso);

      if (countError) console.error("Rate limit check error:", countError);

      if ((count ?? 0) >= 3) {
        return respond({
          ok: false,
          error: "Daily limit reached. Try again tomorrow.",
          diagnostics: { resetTimeZone: "Asia/Kolkata", resetDate: dayWindow.label },
        });
      }
    }

    const { data: fileData, error: downloadError } = await supabase.storage.from("test-pdfs").download(filePath);
    if (downloadError) throw new Error(`Failed to download PDF: ${downloadError.message}`);

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    if (pdfBytes.length > 20 * 1024 * 1024) {
      return respond({ ok: false, error: "PDF file is too large (max 20MB). Please upload a smaller file." });
    }

    const { text: extractedText, pageCharCounts } = await extractPdfText(pdfBytes);
    const isScanned = pageCharCounts.length === 0 || pageCharCounts.some((count) => count < 50);
    const hasGoodText = extractedText.length > 200;
    const pdfBase64 = isScanned || !hasGoodText ? toBase64(pdfBytes) : null;

    let answerKeyText: string | null = null;
    if (answerKeyFilePath) {
      const { data: answerKeyData, error: answerKeyError } = await supabase.storage.from("test-pdfs").download(answerKeyFilePath);
      if (!answerKeyError && answerKeyData) {
        const answerKeyBytes = new Uint8Array(await answerKeyData.arrayBuffer());
        answerKeyText = await extractAnswerKeyText(answerKeyBytes, answerKeyFilePath);
      }
    }

    const { questions: rawQuestions, model: usedModel } = await callGemini(
      GEMINI_API_KEY,
      hasGoodText ? extractedText : null,
      pdfBase64,
      answerKeyText,
    );

    if (!rawQuestions.length) {
      return respond({ ok: false, error: "No questions could be extracted from this PDF. Please ensure it contains MCQ questions." });
    }

    const estimatedQuestionCount = hasGoodText ? estimateQuestionCount(extractedText) : null;
    if (estimatedQuestionCount && rawQuestions.length !== estimatedQuestionCount) {
      return respond({
        ok: false,
        error: `Question count mismatch. I found ${estimatedQuestionCount} questions in the PDF but extracted ${rawQuestions.length}. Please retry with a cleaner PDF or attach an answer key.`,
        diagnostics: { estimatedQuestionCount, extractedQuestionCount: rawQuestions.length, usedModel },
      });
    }

    const questions = rawQuestions
      .map((question: any, index: number) => ({
        question_number: question.questionNumber || index + 1,
        question_text: String(question.questionText || question.question_text || "").trim(),
        option_a: String(question.optionA || question.option_a || "").trim(),
        option_b: String(question.optionB || question.option_b || "").trim(),
        option_c: String(question.optionC || question.option_c || "").trim(),
        option_d: String(question.optionD || question.option_d || "").trim(),
        correct_answer: question.correctAnswer || question.correct_answer
          ? String(question.correctAnswer || question.correct_answer).trim().toUpperCase().charAt(0)
          : null,
      }))
      .filter((question: any) => (
        question.question_text.length > 0 &&
        question.option_a.length > 0 &&
        question.option_b.length > 0 &&
        question.option_c.length > 0 &&
        question.option_d.length > 0
      ));

    if (!questions.length) {
      return respond({ ok: false, error: "Questions were found but none had valid format (need question text + 4 options)." });
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

    if (testError) throw new Error(`Failed to create test: ${testError.message}`);

    const questionsToInsert = questions.map((question: any, index: number) => ({
      test_id: test.id,
      question_number: index + 1,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer || "A",
      explanation: "",
      subject: subject || null,
      topic: null,
      difficulty: "medium",
    }));

    const { error: insertError } = await supabase.from("test_questions").insert(questionsToInsert);
    if (insertError) throw new Error(`Failed to insert questions: ${insertError.message}`);

    if (!isAdmin) {
      await supabase.from("pdf_conversions").insert({ user_id: userId });
    }

    return respond({
      ok: true,
      testId: test.id,
      questionCount: questions.length,
      message: `✅ ${questions.length} questions extracted successfully!`,
      diagnostics: {
        usedModel,
        scannedPdf: isScanned,
        extractedTextLength: extractedText.length,
        estimatedQuestionCount,
      },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return respond({ ok: false, error: error?.message || "An unexpected error occurred during PDF processing." });
  }
});
