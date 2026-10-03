import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Difficulty = "easy" | "moderate" | "hard" | "very_hard";

const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  easy: `EASY (NCERT level). Single-concept, single-step questions. Direct formula substitution, definition recall, straightforward reasoning. A prepared Class 11/12 student should solve each in under 60 seconds.`,
  moderate: `MODERATE (standard JEE Main / NEET level). Two-step questions mixing a concept with a calculation, or two related concepts. Typical 90-120 second questions with believable distractors built from common algebra/sign slips.`,
  hard: `HARD (top-percentile JEE Main / JEE Advanced single-correct level). Multi-concept questions requiring 3-4 non-obvious steps, careful case analysis, limits/approximations, or combined chapters. Distractors MUST be the results of realistic wrong routes (missed factor of 2, wrong limit, wrong sign, forgotten constraint). No question may be solvable by inspection.`,
  very_hard: `VERY HARD (JEE Advanced top-question / olympiad-flavoured level). Genuinely difficult: 4-6 chained steps, non-standard setups, coupled constraints, hybrid chapters, tricky boundary cases or clever substitutions. Numbers should be deliberately non-round so guessing fails. Every distractor must correspond to a specific plausible error. If a competent student could finish it in under two minutes, it is NOT hard enough — replace it.`,
};

const integerRules = `
INTEGER-TYPE QUESTIONS (numerical answer, typed on a keypad):
- Set "question_type": "integer", leave option_a..option_d as empty strings "".
- "correct_answer" MUST be a plain non-negative integer string (e.g. "7", "0", "144"). No signs, units, fractions, decimals or text.
- The answer MUST be a positive integer or zero. If the natural physical answer is negative, RE-FRAME the question so the asked quantity is positive: ask for |x|, for -10x, for (x + 20), for the magnitude, or for x in "the answer is -x/10".
- If the natural answer is a decimal, either scale the asked quantity (e.g. "give the value of 100k") or explicitly append: "Give the answer rounded to the nearest integer."
- Keep answers within 0-9999.
- The explanation must end with the final integer value.
`;

const jsonShape = `Return ONLY a JSON object of the form {"questions": [ ... ]}. Each element:
{
  "question_number": 1,
  "question_type": "mcq" | "integer",
  "question_text": "...",
  "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...",
  "correct_answer": "A" | "B" | "C" | "D" | "<integer>",
  "explanation": "step-by-step reasoning, 2-5 sentences",
  "subject": "Physics",
  "topic": "specific chapter or micro-topic",
  "difficulty": "easy" | "moderate" | "hard" | "very_hard"
}
No markdown, no code fences, no commentary.`;

const callAI = async (apiKey: string, system: string, user: string) => {
  let lastErr = "AI request failed";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429 || resp.status >= 500) {
        lastErr = `AI gateway ${resp.status}`;
         await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (!resp.ok) {
        lastErr = `AI gateway ${resp.status}: ${await resp.text()}`;
        break;
      }
      const data = await resp.json();
      let content: string = data.choices?.[0]?.message?.content ?? "";
      content = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : parsed.questions;
      if (Array.isArray(list) && list.length > 0) return list;
      lastErr = "AI returned no questions";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "AI parse failure";
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
  }
  throw new Error(lastErr);
};

const sanitizeInteger = (raw: unknown) => {
  const m = String(raw ?? "").match(/-?\d+/);
  if (!m) return null;
  const n = Math.abs(parseInt(m[0], 10));
  return Number.isFinite(n) ? String(n) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Backend is not configured");
    const supabase = createClient(url, serviceKey);

    /* ---------- phase 1: create the empty test shell ---------- */
    if (body.phase === "create") {
      const { data: test, error } = await supabase.from("tests").insert({
        title: body.title,
        description: body.description || `AI-generated ${body.examType} test`,
        test_type: "ai_generated",
        exam_type: body.examType,
        subject: body.subject || null,
        chapter: body.chapter || null,
        class_level: body.classLevel || null,
        duration_minutes: body.duration,
        total_marks: body.marks,
        correct_marks: 4,
        wrong_marks: -1,
        unattempted_marks: 0,
        difficulty: body.difficulty || "moderate",
        include_integer: !!body.includeInteger,
        created_by: body.userId,
        is_published: true,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ testId: test.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ---------- phase 2: generate one batch of questions ---------- */
    if (body.phase === "batch") {
      if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

      const {
        testId, startNumber, count, integerCount = 0,
        examType, difficulty = "moderate", subject, chapters = [], topics = [],
        classLevel,
      } = body as {
        testId: string; startNumber: number; count: number; integerCount?: number;
        examType: string; difficulty: Difficulty; subject?: string;
        chapters?: string[]; topics?: string[]; classLevel?: string;
      };

      const mcqCount = Math.max(0, count - integerCount);

      const scopeLines = [
        subject ? `Subject: ${subject}` : `Cover the full ${examType} syllabus with a balanced spread across subjects.`,
        classLevel ? `Class: ${classLevel}` : "",
        chapters.length ? `Chapters (spread questions across these):\n${chapters.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}` : "",
        topics.length ? `Restrict STRICTLY to these micro-topics and tag each question's "topic" with the one it belongs to:\n${topics.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}` : "",
      ].filter(Boolean).join("\n");

      const system = `You are a senior ${examType} paper setter who has authored questions for national-level mock tests. You calibrate difficulty precisely and never produce trivial questions when a hard level is requested. You always return strict JSON.`;

      const user = `Create exactly ${count} unique ${examType} questions.

${scopeLines}

DIFFICULTY (mandatory, applies to every question): ${DIFFICULTY_BRIEF[difficulty] || DIFFICULTY_BRIEF.moderate}

Composition:
- ${mcqCount} single-correct MCQ questions ("question_type": "mcq") with exactly four options and one correct answer.
- ${integerCount} integer-answer questions ("question_type": "integer").
${integerCount > 0 ? integerRules : ""}

Number the questions ${startNumber} to ${startNumber + count - 1} in the "question_number" field.
Set every question's "difficulty" field to "${difficulty}".
All questions must be self-contained (no diagrams or images required).

${jsonShape}`;

      const generated = await callAI(apiKey, system, user);

      const rows = generated.slice(0, count).map((q: any, i: number) => {
        const isInteger = String(q.question_type).toLowerCase() === "integer";
        const intAns = isInteger ? sanitizeInteger(q.correct_answer) : null;
        const asInteger = isInteger && intAns !== null;
        return {
          test_id: testId,
          question_number: startNumber + i,
          question_type: asInteger ? "integer" : "mcq",
          question_text: String(q.question_text || "").trim(),
          option_a: asInteger ? "" : String(q.option_a ?? ""),
          option_b: asInteger ? "" : String(q.option_b ?? ""),
          option_c: asInteger ? "" : String(q.option_c ?? ""),
          option_d: asInteger ? "" : String(q.option_d ?? ""),
          correct_answer: asInteger && intAns !== null ? intAns : String(q.correct_answer || "A").trim().charAt(0).toUpperCase(),
          explanation: String(q.explanation || ""),
          subject: q.subject || subject || null,
          topic: q.topic || null,
          difficulty: difficulty,
        };
      }).filter((r: any) => r.question_text.length > 0);

      if (rows.length === 0) throw new Error("No usable questions in batch");

      const { error } = await supabase.from("test_questions").insert(rows);
      if (error) throw error;

      return new Response(JSON.stringify({ inserted: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ---------- phase 3: finalise (renumber sequentially) ---------- */
    if (body.phase === "finalize") {
      const { data: qs } = await supabase
        .from("test_questions")
        .select("id, question_number")
        .eq("test_id", body.testId)
        .order("question_number");

      if (qs) {
        await Promise.all(qs.map((q, i) =>
          q.question_number === i + 1
            ? Promise.resolve()
            : supabase.from("test_questions").update({ question_number: i + 1 }).eq("id", q.id)
        ));
        await supabase.from("tests").update({ total_marks: qs.length * 4 }).eq("id", body.testId);
      }
      return new Response(JSON.stringify({ ok: true, questionCount: qs?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown phase");
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as any)?.message || JSON.stringify(e);
    console.error("generate-test error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
