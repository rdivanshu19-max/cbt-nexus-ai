import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { examType, testScope, classLevel, subject, chapter, userId, questions: numQuestions, marks, duration, title } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prompt = `Generate exactly ${numQuestions} unique MCQ questions for ${examType} exam preparation.
${testScope === 'subject' ? `Subject: ${subject}` : ''}
${testScope === 'chapter' ? `Subject: ${subject}, Chapter: ${chapter}` : ''}
${testScope === 'class' ? `Class: ${classLevel}` : ''}
${testScope === 'full' ? `Full syllabus covering all subjects equally` : ''}

Each question must have exactly 4 options (A, B, C, D), one correct answer, and a brief explanation.
The questions should be at JEE/NEET competitive exam level - challenging but fair.

Return as JSON array with this exact structure:
[{
  "question_number": 1,
  "question_text": "...",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_answer": "A",
  "explanation": "...",
  "subject": "Physics",
  "topic": "Mechanics"
}]

IMPORTANT: Return ONLY the JSON array, no markdown, no code blocks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert exam question generator for JEE and NEET competitive exams. Generate high-quality, unique MCQ questions. Always return valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error("AI generation failed");

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Create test
    const { data: test, error: testErr } = await supabase.from('tests').insert({
      title,
      description: `AI-generated ${examType} ${testScope} test`,
      test_type: 'ai_generated',
      exam_type: examType,
      subject: subject || null,
      chapter: chapter || null,
      class_level: classLevel || null,
      duration_minutes: duration,
      total_marks: marks,
      correct_marks: 4,
      wrong_marks: -1,
      unattempted_marks: 0,
      created_by: userId,
      is_published: true,
    }).select().single();

    if (testErr) throw testErr;

    // Insert questions
    const questionsToInsert = generatedQuestions.map((q: any, i: number) => ({
      test_id: test.id,
      question_number: q.question_number || i + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      subject: q.subject || subject || null,
      topic: q.topic || null,
      difficulty: 'medium',
    }));

    const { error: qErr } = await supabase.from('test_questions').insert(questionsToInsert);
    if (qErr) throw qErr;

    return new Response(JSON.stringify({ testId: test.id, questionCount: questionsToInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
