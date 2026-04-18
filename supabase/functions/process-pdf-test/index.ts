import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
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

type ExtractedPage = {
  pageNumber: number;
  text: string;
  charCount: number;
};

type NormalizedQuestion = {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string | null;
  image_url: string | null;
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

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";
const QUESTION_START_REGEX = /^\s*(?:Q(?:uestion)?\s*)?\(?\d{1,3}\)?(?:\s*[.)\-:]|\s+)/i;
const VALID_ANSWERS = new Set(["A", "B", "C", "D"]);
const EXTRACT_FAILURE_MESSAGE = "Extraction failed. Please try again in 2 minutes.";
const AI_BUSY_MESSAGE = "AI is busy right now. Please wait 2 minutes and try again.";

const BASE_PROMPT = `You are an exam question extractor for Nexus CBT. Extract every MCQ question from this content exactly as written. Return ONLY a raw JSON array. No markdown, no explanation, no code blocks. Each object must have exactly these fields: questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer, imageUrl. Keep original wording. Do not invent or summarize. If correct answer is not visible, set correctAnswer to null. If a question refers to a graph, figure, diagram or image, set imageUrl to "GRAPH_PRESENT". Otherwise set imageUrl to null. If the content starts or ends in the middle of a question, skip the incomplete fragment and only return complete questions from this chunk.`;

const MATH_PROMPT_SUFFIX = `For all mathematical expressions use these rules strictly: Write fractions as (numerator)/(denominator) for example 1/x, 2/3, (x+1)/(x-1). Write exponents as x^2, x^3, x^n. Write square root as sqrt(x). Write subscripts as x_1, x_2. Preserve all brackets ( ) [ ] { } exactly. Never remove or simplify any mathematical symbol. Greek letters: write alpha, beta, theta, pi etc as their actual symbols α β θ π.`;

const ANSWER_KEY_PROMPT = `This is an answer key. Extract question numbers and their correct answers. Return ONLY a raw JSON object where keys are question numbers as strings and values are the correct answer as A, B, C, or D. Example: {"1":"A","2":"C"}. Apply these conversions: 0=A, 1=B, 2=C, 3=D or match directly if already A/B/C/D. No explanation, no markdown.`;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as never);
  }
  return btoa(binary);
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function normalizeAnswerValue(value: string) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/^OPTION\s+/, "")
    .replace(/^ANSWER\s*[:\-]\s*/, "")
    .replace(/^CORRECT\s*ANSWER\s*[:\-]\s*/, "");
}

function cleanAiJson(content: string) {
  return content.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
}

function cleanCorrectAnswer(
  value: unknown,
  options?: { A: string; B: string; C: string; D: string },
): string | null {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = normalizeAnswerValue(raw);
  const directMap: Record<string, string> = {
    "0": "A",
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    A: "A",
    B: "B",
    C: "C",
    D: "D",
  };

  if (directMap[normalized]) return directMap[normalized];

  const optionLabelMatch = normalized.match(/^(?:OPTION\s*)?([ABCD])(?:[).:\-]|\s|$)/);
  if (optionLabelMatch?.[1] && VALID_ANSWERS.has(optionLabelMatch[1])) {
    return optionLabelMatch[1];
  }

  if (options) {
    const answerLike = normalizeAnswerValue(raw).replace(/[().:\-]/g, "").trim();
    for (const [label, optionText] of Object.entries(options)) {
      const normalizedOption = normalizeAnswerValue(optionText);
      if (!normalizedOption) continue;
      if (answerLike === normalizedOption) return label;
      if (answerLike && normalizedOption.includes(answerLike)) return label;
      if (answerLike && answerLike.includes(normalizedOption)) return label;
    }
  }

  const standalone = normalized.match(/\b([ABCD])\b/);
  return standalone?.[1] ?? null;
}

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

async function extractPdfPages(bytes: Uint8Array): Promise<ExtractedPage[]> {
  try {
    const pdfjsLib = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      standardFontDataUrl: undefined,
    });
    const pdf = await loadingTask.promise;
    const pages: ExtractedPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const positioned = (textContent.items as Array<{ str?: string; transform?: number[] }>)
        .map((item) => ({
          text: normalizeText(item.str ?? ""),
          x: Number(item.transform?.[4] ?? 0),
          y: Number(item.transform?.[5] ?? 0),
        }))
        .filter((item) => item.text.length > 0)
        .sort((a, b) => {
          const deltaY = b.y - a.y;
          if (Math.abs(deltaY) > 2.5) return deltaY;
          return a.x - b.x;
        });

      const lines: string[] = [];
      let currentLine: string[] = [];
      let currentY: number | null = null;

      for (const item of positioned) {
        if (currentY === null || Math.abs(item.y - currentY) <= 2.5) {
          currentLine.push(item.text);
          currentY = currentY === null ? item.y : currentY;
          continue;
        }

        lines.push(normalizeText(currentLine.join(" ")).replace(/\s+([,.;:?!])/g, "$1"));
        currentLine = [item.text];
        currentY = item.y;
      }

      if (currentLine.length) {
        lines.push(normalizeText(currentLine.join(" ")).replace(/\s+([,.;:?!])/g, "$1"));
      }

      const text = lines.join("\n").trim();
      pages.push({ pageNumber, text, charCount: text.length });
    }

    return pages;
  } catch (error) {
    console.error("pdfjs extraction failed:", error);
    return [];
  }
}

async function extractAnswerKeyText(bytes: Uint8Array, filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    const pages = await extractPdfPages(bytes);
    return pages.map((page) => page.text).filter(Boolean).join("\n\n");
  }
  return new TextDecoder().decode(bytes);
}

function splitIntoQuestionBlocks(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const blocks: string[] = [];
  let current: string[] = [];
  let sawQuestionBoundary = false;

  for (const line of lines) {
    if (QUESTION_START_REGEX.test(line)) {
      sawQuestionBoundary = true;
      if (current.length) {
        blocks.push(current.join("\n"));
        current = [];
      }
    }
    current.push(line);
  }

  if (current.length) blocks.push(current.join("\n"));

  return sawQuestionBoundary ? blocks : [lines.join("\n")];
}

function splitOversizedBlock(block: string, maxLength: number): string[] {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }

    const candidate = `${current}\n${line}`;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      chunks.push(current);
      current = line;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function buildChunks(text: string, maxLength = 2000): string[] {
  const blocks = splitIntoQuestionBlocks(text);
  if (!blocks.length) return [];

  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    if (!block.trim()) continue;

    if (block.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitOversizedBlock(block, maxLength));
      continue;
    }

    if (!current) {
      current = block;
      continue;
    }

    const candidate = `${current}\n\n${block}`;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      chunks.push(current);
      current = block;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function parseJsonArray(raw: string): any[] {
  const cleaned = cleanAiJson(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }

  return [];
}

function parseJsonObject(raw: string): Record<string, string> {
  const cleaned = cleanAiJson(raw);

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }
  }

  return {};
}

async function geminiCall(apiKey: string, parts: Array<Record<string, unknown>>): Promise<string> {
  const url = `${GEMINI_ENDPOINT}${apiKey}`;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      lastStatus = response.status;
      lastBody = await response.text();
      console.error(`Gemini request failed (attempt ${attempt})`, lastStatus, lastBody.slice(0, 400));

      if (lastStatus >= 500 || lastStatus === 429) {
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        throw new Error(AI_BUSY_MESSAGE);
      }

      throw new Error(`Gemini API error: ${lastStatus}`);
    } catch (error: any) {
      if (error?.message === AI_BUSY_MESSAGE) throw error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      if (lastStatus >= 500 || !lastStatus) {
        throw new Error(AI_BUSY_MESSAGE);
      }
      throw new Error(error?.message || `Gemini API error: ${lastStatus}`);
    }
  }

  throw new Error(lastStatus >= 500 ? AI_BUSY_MESSAGE : `Gemini API error: ${lastStatus}`);
}

async function extractQuestionsFromChunk(apiKey: string, chunk: string) {
  const text = await geminiCall(apiKey, [
    { text: `${BASE_PROMPT}\n\n${MATH_PROMPT_SUFFIX}` },
    { text: `EXAM CONTENT:\n${chunk}` },
  ]);
  return parseJsonArray(text);
}

async function extractQuestionsFromScannedPage(apiKey: string, pagePdfBase64: string, pageNumber: number) {
  const text = await geminiCall(apiKey, [
    { text: `${BASE_PROMPT}\n\n${MATH_PROMPT_SUFFIX}\n\nExtract complete questions only from scanned page ${pageNumber}.` },
    { inlineData: { mimeType: "application/pdf", data: pagePdfBase64 } },
  ]);
  return parseJsonArray(text);
}

async function buildSinglePagePdfBase64(sourceBytes: Uint8Array, pageIndexes: number[]) {
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const pages: Array<{ pageNumber: number; base64: string }> = [];

  for (const pageIndex of pageIndexes) {
    const outputPdf = await PDFDocument.create();
    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageIndex]);
    outputPdf.addPage(copiedPage);
    const pageBytes = await outputPdf.save();
    pages.push({ pageNumber: pageIndex + 1, base64: toBase64(pageBytes) });
  }

  return pages;
}

function dedupeQuestions(questions: any[]) {
  const deduped = new Map<number, any>();

  questions.forEach((question, index) => {
    const questionNumber = Number(question?.questionNumber ?? question?.question_number ?? index + 1);
    if (!Number.isFinite(questionNumber)) return;

    const existing = deduped.get(questionNumber);
    if (!existing) {
      deduped.set(questionNumber, question);
      return;
    }

    const existingScore = JSON.stringify(existing).length;
    const nextScore = JSON.stringify(question).length;
    if (nextScore > existingScore) deduped.set(questionNumber, question);
  });

  return Array.from(deduped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, question]) => question);
}

async function insertQuestions(supabase: ReturnType<typeof createClient>, testId: string, rows: NormalizedQuestion[], subject: string | null) {
  const insertedRows: Array<NormalizedQuestion & { test_id: string }> = [];
  const failedRows: Array<{ questionNumber: number; error: string }> = [];

  for (const row of rows) {
    try {
      const payload = {
        test_id: testId,
        question_number: row.question_number,
        question_text: row.question_text,
        option_a: row.option_a,
        option_b: row.option_b,
        option_c: row.option_c,
        option_d: row.option_d,
        correct_answer: row.correct_answer || "A",
        explanation: "",
        subject,
        topic: null,
        difficulty: "medium",
        image_url: row.image_url,
      };

      const { error } = await supabase.from("test_questions").insert(payload);
      if (error) throw error;
      insertedRows.push(payload);
    } catch (error: any) {
      console.error(`Question insert failed for Q${row.question_number}:`, error);
      failedRows.push({ questionNumber: row.question_number, error: error?.message || "Insert failed" });
    }
  }

  return { insertedRows, failedRows };
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return respond({ ok: false, error: "Server configuration is incomplete" });
    }

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

    const { data: fileData, error: fileError } = await supabase.storage.from("test-pdfs").download(filePath);
    if (fileError || !fileData) {
      return respond({ ok: false, error: `Failed to download PDF: ${fileError?.message || "File missing"}` });
    }

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    if (pdfBytes.length > 20 * 1024 * 1024) {
      return respond({ ok: false, error: "PDF file is too large (max 20MB)." });
    }

    const pages = await extractPdfPages(pdfBytes);
    const textPages = pages.filter((page) => page.charCount >= 50);
    const scannedPageIndexes = pages.filter((page) => page.charCount < 50).map((page) => page.pageNumber - 1);
    const extractedText = textPages.map((page) => page.text).filter(Boolean).join("\n\n");
    const textChunks = buildChunks(extractedText, 2000);

    let answerKeyText: string | null = null;
    if (answerKeyFilePath) {
      const { data: answerKeyFile, error: answerKeyError } = await supabase.storage.from("test-pdfs").download(answerKeyFilePath);
      if (!answerKeyError && answerKeyFile) {
        const answerKeyBytes = new Uint8Array(await answerKeyFile.arrayBuffer());
        answerKeyText = await extractAnswerKeyText(answerKeyBytes, answerKeyFilePath);
      }
    }

    const allQuestions: any[] = [];
    let failedChunks = 0;
    let failedScannedPages = 0;

    for (const chunk of textChunks) {
      try {
        const extracted = await extractQuestionsFromChunk(GEMINI_API_KEY, chunk);
        allQuestions.push(...extracted);
      } catch (error: any) {
        failedChunks += 1;
        console.error("Chunk extraction failed:", error?.message || error);
        if (error?.message === AI_BUSY_MESSAGE) {
          return respond({ ok: false, error: AI_BUSY_MESSAGE });
        }
      }
    }

    if (scannedPageIndexes.length) {
      try {
        const scannedPages = await buildSinglePagePdfBase64(pdfBytes, scannedPageIndexes);
        for (const page of scannedPages) {
          try {
            const extracted = await extractQuestionsFromScannedPage(GEMINI_API_KEY, page.base64, page.pageNumber);
            allQuestions.push(...extracted);
          } catch (error: any) {
            failedScannedPages += 1;
            console.error(`Scanned page extraction failed for page ${page.pageNumber}:`, error?.message || error);
            if (error?.message === AI_BUSY_MESSAGE && allQuestions.length === 0) {
              return respond({ ok: false, error: AI_BUSY_MESSAGE });
            }
          }
        }
      } catch (error) {
        console.error("Scanned PDF handling failed:", error);
      }
    }

    const mergedQuestions = dedupeQuestions(allQuestions);
    if (!mergedQuestions.length) {
      return respond({ ok: false, error: EXTRACT_FAILURE_MESSAGE });
    }

    let answerKeyMap: Record<string, string> = {};
    if (answerKeyText && answerKeyText.trim().length > 0) {
      try {
        const answerKeyResponse = await geminiCall(GEMINI_API_KEY, [
          { text: ANSWER_KEY_PROMPT },
          { text: `ANSWER KEY CONTENT:\n${answerKeyText.slice(0, 20000)}` },
        ]);
        const parsedAnswerKey = parseJsonObject(answerKeyResponse);
        answerKeyMap = Object.fromEntries(
          Object.entries(parsedAnswerKey)
            .map(([key, value]) => [String(key).trim(), cleanCorrectAnswer(value)])
            .filter((entry): entry is [string, string] => Boolean(entry[1])),
        );
      } catch (error) {
        console.error("Answer key parse failed:", error);
      }
    }

    const normalizedQuestions: NormalizedQuestion[] = mergedQuestions
      .map((question: any, index: number) => {
        const questionNumber = Number(question.questionNumber ?? question.question_number ?? index + 1);
        const options = {
          A: String(question.optionA ?? question.option_a ?? "").trim(),
          B: String(question.optionB ?? question.option_b ?? "").trim(),
          C: String(question.optionC ?? question.option_c ?? "").trim(),
          D: String(question.optionD ?? question.option_d ?? "").trim(),
        };
        const overrideAnswer = answerKeyMap[String(questionNumber)];
        const correctAnswer = cleanCorrectAnswer(overrideAnswer ?? question.correctAnswer ?? question.correct_answer, options);
        const rawImageUrl = String(question.imageUrl ?? question.image_url ?? "").trim();

        return {
          question_number: Number.isFinite(questionNumber) ? questionNumber : index + 1,
          question_text: String(question.questionText ?? question.question_text ?? "").trim(),
          option_a: options.A,
          option_b: options.B,
          option_c: options.C,
          option_d: options.D,
          correct_answer: correctAnswer,
          image_url: rawImageUrl.toUpperCase().includes("GRAPH_PRESENT") ? "GRAPH_PRESENT" : null,
        };
      })
      .filter((question) => question.question_text && question.option_a && question.option_b && question.option_c && question.option_d)
      .sort((a, b) => a.question_number - b.question_number);

    if (!normalizedQuestions.length) {
      return respond({ ok: false, error: EXTRACT_FAILURE_MESSAGE });
    }

    let testId: string | null = null;

    try {
      const { data: createdTest, error: testInsertError } = await supabase
        .from("tests")
        .insert({
          title,
          description: `Extracted from uploaded PDF (${normalizedQuestions.length} questions)`,
          test_type: isAdminUpload ? "admin_uploaded" : "user_custom",
          exam_type: examType || null,
          subject: subject || null,
          duration_minutes: duration,
          total_marks: normalizedQuestions.length * correctMarks,
          correct_marks: correctMarks,
          wrong_marks: wrongMarks,
          unattempted_marks: 0,
          created_by: userId,
          is_published: isAdminUpload,
          pdf_url: filePath,
        })
        .select("id")
        .single();

      if (testInsertError || !createdTest) {
        throw testInsertError || new Error("Unable to create test");
      }

      testId = createdTest.id;
    } catch (error: any) {
      console.error("Test insert failed:", error);
      return respond({ ok: false, error: `Failed to create test: ${error?.message || "Unknown error"}` });
    }

    const { insertedRows, failedRows } = await insertQuestions(supabase, testId, normalizedQuestions, subject || null);

    if (!insertedRows.length) {
      try {
        await supabase.from("tests").delete().eq("id", testId);
      } catch (cleanupError) {
        console.error("Cleanup failed after question insert error:", cleanupError);
      }
      return respond({ ok: false, error: EXTRACT_FAILURE_MESSAGE });
    }

    if (insertedRows.length !== normalizedQuestions.length) {
      try {
        await supabase
          .from("tests")
          .update({
            total_marks: insertedRows.length * correctMarks,
            description: `Extracted from uploaded PDF (${insertedRows.length} questions)`,
          })
          .eq("id", testId);
      } catch (updateError) {
        console.error("Failed to update test totals after partial insert:", updateError);
      }
    }

    if (!isAdmin) {
      try {
        const { error } = await supabase.from("pdf_conversions").insert({ user_id: userId });
        if (error) throw error;
      } catch (error) {
        console.error("Usage insert failed:", error);
      }
    }

    return respond({
      ok: true,
      testId,
      questionCount: insertedRows.length,
      message: `✅ ${insertedRows.length} questions extracted successfully`,
      diagnostics: {
        usedModel: GEMINI_MODEL,
        scannedPdf: scannedPageIndexes.length > 0,
        scannedPages: scannedPageIndexes.length,
        extractedTextLength: extractedText.length,
        pageCount: pages.length,
        chunkCount: textChunks.length,
        failedChunks,
        failedScannedPages,
        answerKeyApplied: Object.keys(answerKeyMap).length,
        insertFailures: failedRows.length,
        lowQuestionCountWarning: insertedRows.length < Math.max(5, Math.floor(pages.length * 0.6)),
      },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return respond({ ok: false, error: error?.message || EXTRACT_FAILURE_MESSAGE });
  }
});
