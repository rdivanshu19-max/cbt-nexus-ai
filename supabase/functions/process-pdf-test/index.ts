import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, title, duration, correctMarks, wrongMarks, filePath, isAdmin, examType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download PDF content
    const { data: fileData, error: dlErr } = await supabase.storage.from('test-pdfs').download(filePath);
    if (dlErr) throw dlErr;

    const pdfText = await fileData.text();

    const prompt = `Extract all MCQ questions from this test paper content. Convert them into a structured JSON array.
Each question must have: question_text, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), explanation, subject, topic.
If you cannot determine the correct answer, use your knowledge to provide the best answer.

PDF Content:
${pdfText.substring(0, 15000)}

Return ONLY a valid JSON array, no markdown code blocks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert at extracting MCQ questions from exam papers. Always return valid JSON arrays only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error("AI processing failed");

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse extracted questions");
    }

    const totalMarks = questions.length * (correctMarks || 4);

    const { data: test, error: testErr } = await supabase.from('tests').insert({
      title,
      description: `Extracted from uploaded PDF`,
      test_type: isAdmin ? 'admin_uploaded' : 'user_custom',
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
      question_text: q.question_text || q.question || '',
      option_a: q.option_a || q.options?.[0] || '',
      option_b: q.option_b || q.options?.[1] || '',
      option_c: q.option_c || q.options?.[2] || '',
      option_d: q.option_d || q.options?.[3] || '',
      correct_answer: q.correct_answer || 'A',
      explanation: q.explanation || '',
      subject: q.subject || null,
      topic: q.topic || null,
      difficulty: 'medium',
    }));

    await supabase.from('test_questions').insert(questionsToInsert);

    return new Response(JSON.stringify({ testId: test.id, questionCount: questionsToInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
