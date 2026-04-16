import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
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
});

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert binary PDF bytes to base64 */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const cleanAiJson = (c: string) =>
  c
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

/** Try to extract text from PDF using pdfjs. Returns text + per-page char counts. */
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
      const text = tc.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push(text);
      pageCharCounts.push(text.length);
    }

    return { text: pageTexts.join("\n\n"), pageCharCounts };
  } catch (err) {
    console.error("pdfjs extraction failed:", err);
    return { text: "", pageCharCounts: [] };
  }
}

/** Extract text from answer key file (PDF or TXT) */
async function extractAnswerKeyText(bytes: Uint8Array, filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    const result = await extractPdfText(bytes);
    return result.text;
  }
  return new TextDecoder().decode(bytes);
}

// ── Gemini API ───────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an exam question extractor. Extract every MCQ question from this content. Return ONLY a raw JSON array. No markdown, no explanation, no code blocks. Each object must have exactly these fields: questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer. If correct answer is not visible, set correctAnswer to null. Do not include anything outside the JSON array.`;

async function callGemini(
  apiKey: string,
  textContent: string | null,
  pdfBase64: string | null,
  answerKeyText: string | null,
): Promise<any[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Build parts array
  const parts: any[] = [];

  // Add the instruction prompt
  let fullPrompt = EXTRACTION_PROMPT;
  if (answerKeyText) {
    fullPrompt += `\n\nANSWER KEY:\n${answerKeyText.slice(0, 20000)}`;
  }
  parts.push({ text: fullPrompt });

  // If we have good extracted text, send it as text
  if (textContent && textContent.length > 200) {
    parts.push({ text: `\n\nEXTRACTED TEXT FROM PDF:\n${textContent.slice(0, 100000)}` });
  }

  // If the PDF is scanned/image-based, send the whole PDF as inline data
  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    });
  }

  console.log(`Calling Gemini: textLen=${textContent?.length ?? 0}, hasPdfBlob=${!!pdfBase64}, hasAnswerKey=${!!answerKeyText}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 65536,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status} - ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = cleanAiJson(rawContent);

  console.log("Gemini raw response length:", rawContent.length);

  // Parse - it should be a JSON array
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to find array in the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      parsed = JSON.parse(arrayMatch[0]);
    } else {
      throw new Error("Could not parse Gemini response as JSON");
    }
  }

  const questions = Array.isArray(parsed) ? parsed : parsed?.questions || [];
  return questions;
}

// ── main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Missing authorization header" }, 401);

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return respond({ error: parsedBody.error.flatten().fieldErrors }, 400);
    }

    const { title, duration, correctMarks, wrongMarks, filePath, answerKeyFilePath, isAdminUpload, examType } = parsedBody.data;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!GEMINI_API_KEY) {
      return respond({ error: "GEMINI_API_KEY not configured on server" }, 500);
    }

    // Auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return respond({ error: "Invalid user session" }, 401);

    const userId = authData.user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    if (isAdminUpload && !isAdmin) {
      return respond({ error: "Only admins can upload official tests" }, 403);
    }

    // Rate limiting for non-admin users: 3 per day
    if (!isAdmin) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { count, error: countErr } = await supabase
        .from("pdf_conversions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("converted_at", todayStart.toISOString());

      if (countErr) console.error("Rate limit check error:", countErr);

      if ((count ?? 0) >= 3) {
        return respond({ error: "Daily limit reached. You can convert up to 3 PDFs per day. Try again tomorrow." }, 429);
      }
    }

    // Download PDF
    console.log("Downloading PDF:", filePath);
    const { data: fileData, error: dlErr } = await supabase.storage.from("test-pdfs").download(filePath);
    if (dlErr) throw new Error(`Failed to download PDF: ${dlErr.message}`);

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    console.log("PDF size:", pdfBytes.length, "bytes");

    // Extract text
    const { text: extractedText, pageCharCounts } = await extractPdfText(pdfBytes);
    console.log("Extracted text length:", extractedText.length, "Page char counts:", pageCharCounts);

    // Determine if PDF is scanned (any page with < 50 chars)
    const isScanned = pageCharCounts.length === 0 || pageCharCounts.some((c) => c < 50);
    const hasGoodText = extractedText.length > 200;

    // For scanned PDFs or PDFs with poor text, send the raw PDF as base64 to Gemini
    let pdfBase64: string | null = null;
    if (isScanned || !hasGoodText) {
      console.log("PDF appears scanned or has poor text extraction. Sending PDF as image to Gemini.");
      // Gemini 1.5 Flash supports inline PDF
      if (pdfBytes.length <= 20 * 1024 * 1024) {
        pdfBase64 = toBase64(pdfBytes);
      } else {
        return respond({ error: "PDF file is too large (max 20MB). Please upload a smaller file." }, 413);
      }
    }

    // Download answer key if provided
    let answerKeyText: string | null = null;
    if (answerKeyFilePath) {
      const { data: akData, error: akErr } = await supabase.storage.from("test-pdfs").download(answerKeyFilePath);
      if (akErr) {
        console.error("Answer key download error:", akErr);
      } else {
        const akBytes = new Uint8Array(await akData.arrayBuffer());
        answerKeyText = await extractAnswerKeyText(akBytes, answerKeyFilePath);
      }
    }

    // Call Gemini
    const rawQuestions = await callGemini(
      GEMINI_API_KEY,
      hasGoodText ? extractedText : null,
      pdfBase64,
      answerKeyText,
    );

    console.log("Gemini returned", rawQuestions.length, "questions");

    if (!rawQuestions.length) {
      return respond({ error: "No questions could be extracted from this PDF. Please ensure it contains MCQ questions." }, 422);
    }

    // Normalize questions
    const questions = rawQuestions
      .map((q: any, i: number) => ({
        question_number: q.questionNumber || i + 1,
        question_text: String(q.questionText || q.question_text || "").trim(),
        option_a: String(q.optionA || q.option_a || "").trim(),
        option_b: String(q.optionB || q.option_b || "").trim(),
        option_c: String(q.optionC || q.option_c || "").trim(),
        option_d: String(q.optionD || q.option_d || "").trim(),
        correct_answer: q.correctAnswer || q.correct_answer
          ? String(q.correctAnswer || q.correct_answer).trim().toUpperCase().charAt(0)
          : null,
        explanation: "",
        subject: null,
        topic: null,
      }))
      .filter(
        (q: any) =>
          q.question_text.length > 0 &&
          q.option_a.length > 0 &&
          q.option_b.length > 0 &&
          q.option_c.length > 0 &&
          q.option_d.length > 0,
      );

    if (!questions.length) {
      return respond({ error: "Questions were found but none had valid format (need question text + 4 options)." }, 422);
    }

    // Create test in DB
    const totalMarks = questions.length * correctMarks;
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .insert({
        title,
        description: `Extracted from uploaded PDF (${questions.length} questions)`,
        test_type: isAdminUpload ? "admin_uploaded" : "user_custom",
        exam_type: examType || null,
        duration_minutes: duration,
        total_marks: totalMarks,
        correct_marks: correctMarks,
        wrong_marks: wrongMarks,
        unattempted_marks: 0,
        created_by: userId,
        is_published: isAdminUpload ? true : true,
        pdf_url: filePath,
      })
      .select()
      .single();

    if (testErr) throw new Error(`Failed to create test: ${testErr.message}`);

    // Insert questions
    const questionsToInsert = questions.map((q: any, i: number) => ({
      test_id: test.id,
      question_number: i + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer || "A",
      explanation: q.explanation || "",
      subject: q.subject,
      topic: q.topic,
      difficulty: "medium",
    }));

    const { error: insertErr } = await supabase.from("test_questions").insert(questionsToInsert);
    if (insertErr) throw new Error(`Failed to insert questions: ${insertErr.message}`);

    // Track conversion for rate limiting (non-admin only)
    if (!isAdmin) {
      await supabase.from("pdf_conversions").insert({ user_id: userId });
    }

    console.log(`✅ Success: ${questions.length} questions extracted for test ${test.id}`);

    return respond({
      testId: test.id,
      questionCount: questions.length,
      message: `✅ ${questions.length} questions extracted successfully!`,
    });
  } catch (e: any) {
    console.error("Edge function error:", e);
    return respond({ error: e.message || "An unexpected error occurred during PDF processing." }, 500);
  }
});
