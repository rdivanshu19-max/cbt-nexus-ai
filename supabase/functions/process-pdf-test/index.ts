import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.25.76";
import * as pdfjsLib from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  duration: z.number().int().min(5).max(600),
  correctMarks: z.number().positive().max(100).optional().default(4),
  wrongMarks: z.number().min(-100).max(0).optional().default(-1),
  filePath: z.string().min(1),
  answerKeyFilePath: z.string().nullable().optional(),
  isAdminUpload: z.boolean().optional().default(false),
  examType: z.string().trim().min(1).max(50).nullable().optional(),
});

const cleanAiJson = (content: string) => content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

const normaliseText = (text: string) => text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

const estimateQuestionCount = (text: string) => {
  const matches = [...text.matchAll(/(?:^|\n)\s*(\d{1,3})\s*[\).:-]/gm)].map((match) => Number.parseInt(match[1], 10));
  if (matches.length < 5) return null;

  const uniqueAscending = [...new Set(matches)].filter((value) => value > 0 && value <= 300).sort((a, b) => a - b);
  if (uniqueAscending.length < 5) return null;

  let consecutive = 0;
  for (const value of uniqueAscending) {
    if (value === consecutive + 1) consecutive += 1;
  }

  return consecutive >= 5 ? consecutive : uniqueAscending.length;
};

const extractPdfText = async (bytes: Uint8Array) => {
  const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (lines) {
      pageTexts.push(`Page ${pageNumber}\n${lines}`);
    }
  }

  return normaliseText(pageTexts.join("\n\n"));
};

const extractTextFromFile = async (bytes: Uint8Array, filePath: string) => {
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return extractPdfText(bytes);
  return normaliseText(new TextDecoder().decode(bytes));
};

const buildPrompt = (pdfText: string, answerKeyText: string | null, expectedQuestionCount: number | null, previousCount?: number) => `You are converting a competitive exam paper into CBT JSON.

HARD RULES:
- Extract only the questions that already exist in the source paper.
- Preserve the original wording of every question and option as closely as possible.
- Do not paraphrase, simplify, invent, merge, or split questions.
- Keep the original order.
- Every question must have exactly 4 options mapped to option_a, option_b, option_c, option_d.
- If an answer key is provided, use it exactly.
- If an answer key is missing, infer the best correct answer only when necessary.
- Keep explanations concise and relevant.
- Expected question count: ${expectedQuestionCount ?? "unknown"}.
${previousCount ? `- Your previous extraction returned ${previousCount} questions, which was incorrect. Fix the missing or extra questions and return the full corrected set.` : ""}

Return ONLY a valid JSON object in this shape:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "",
      "option_a": "",
      "option_b": "",
      "option_c": "",
      "option_d": "",
      "correct_answer": "A",
      "explanation": "",
      "subject": "",
      "topic": ""
    }
  ]
}

SOURCE PAPER TEXT:
${pdfText}

${answerKeyText ? `ANSWER KEY TEXT:\n${answerKeyText}` : "No answer key was supplied."}`;

const requestQuestionExtraction = async (lovableApiKey: string, pdfText: string, answerKeyText: string | null, expectedQuestionCount: number | null, previousCount?: number) => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: "You extract JEE/NEET style MCQ papers into strict JSON while preserving the source wording and question count.",
        },
        {
          role: "user",
          content: buildPrompt(pdfText, answerKeyText, expectedQuestionCount, previousCount),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("AI processing failed");
  }

  const aiData = await response.json();
  const content = cleanAiJson(aiData.choices?.[0]?.message?.content || "{}");
  const parsed = JSON.parse(content);
  const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];

  return rawQuestions
    .map((question: Record<string, unknown>, index: number) => ({
      question_number: index + 1,
      question_text: String(question.question_text || question.question || "").trim(),
      option_a: String(question.option_a || question.optionA || "").trim(),
      option_b: String(question.option_b || question.optionB || "").trim(),
      option_c: String(question.option_c || question.optionC || "").trim(),
      option_d: String(question.option_d || question.optionD || "").trim(),
      correct_answer: String(question.correct_answer || "A").trim().toUpperCase().slice(0, 1) || "A",
      explanation: String(question.explanation || "").trim(),
      subject: String(question.subject || "").trim() || null,
      topic: String(question.topic || "").trim() || null,
    }))
    .filter((question: Record<string, unknown>) => {
      return [question.question_text, question.option_a, question.option_b, question.option_c, question.option_d].every((value) => typeof value === "string" && value.length > 0);
    });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: parsedBody.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, duration, correctMarks, wrongMarks, filePath, answerKeyFilePath, isAdminUpload, examType } = parsedBody.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: authData, error: authError } = await authenticatedClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    if (isAdminUpload && !isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can upload official tests" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fileData, error: dlErr } = await supabase.storage.from('test-pdfs').download(filePath);
    if (dlErr) throw dlErr;

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    const pdfText = await extractPdfText(pdfBytes);

    if (pdfText.length < 200) {
      return new Response(JSON.stringify({ error: "This PDF did not expose enough readable text. Please upload a text-based PDF or attach a clearer source file." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let answerKeyText: string | null = null;
    if (answerKeyFilePath) {
      const { data: answerKeyData, error: answerKeyError } = await supabase.storage.from('test-pdfs').download(answerKeyFilePath);
      if (answerKeyError) throw answerKeyError;

      const answerKeyBytes = new Uint8Array(await answerKeyData.arrayBuffer());
      answerKeyText = await extractTextFromFile(answerKeyBytes, answerKeyFilePath);
    }

    const expectedQuestionCount = estimateQuestionCount(pdfText);
    let questions = await requestQuestionExtraction(LOVABLE_API_KEY, pdfText.slice(0, 100000), answerKeyText?.slice(0, 20000) ?? null, expectedQuestionCount);

    if (expectedQuestionCount && questions.length !== expectedQuestionCount) {
      questions = await requestQuestionExtraction(
        LOVABLE_API_KEY,
        pdfText.slice(0, 100000),
        answerKeyText?.slice(0, 20000) ?? null,
        expectedQuestionCount,
        questions.length,
      );
    }

    if (!questions.length) {
      return new Response(JSON.stringify({ error: "No valid questions could be extracted from the uploaded PDF." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (expectedQuestionCount && questions.length !== expectedQuestionCount) {
      return new Response(JSON.stringify({ error: `Question count mismatch: detected ${expectedQuestionCount} questions in the paper but extracted ${questions.length}. Please re-upload a cleaner PDF or include an answer key.` }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalMarks = questions.length * (correctMarks || 4);

    const { data: test, error: testErr } = await supabase.from('tests').insert({
      title,
      description: `Extracted from uploaded PDF`,
      test_type: isAdminUpload ? 'admin_uploaded' : 'user_custom',
      exam_type: examType || null,
      duration_minutes: duration,
      total_marks: totalMarks,
      correct_marks: correctMarks || 4,
      wrong_marks: wrongMarks || -1,
      unattempted_marks: 0,
      created_by: userId,
      is_published: true,
      pdf_url: filePath,
    }).select().single();

    if (testErr) throw testErr;

    const questionsToInsert = questions.map((q: any, i: number) => ({
      test_id: test.id,
      question_number: i + 1,
      question_text: q.question_text || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || 'A',
      explanation: q.explanation || '',
      subject: q.subject || null,
      topic: q.topic || null,
      difficulty: 'medium',
    }));

    const { error: insertQuestionsError } = await supabase.from('test_questions').insert(questionsToInsert);
    if (insertQuestionsError) throw insertQuestionsError;

    return new Response(JSON.stringify({ testId: test.id, questionCount: questionsToInsert.length, expectedQuestionCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
