// Generate short notes for a JEE/NEET chapter using Lovable AI Gateway.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  exam: string;          // JEE | NEET | Both
  classLevel: string;    // 11 | 12 | Dropper
  subject: string;       // Physics | Chemistry | Biology | Maths
  chapter: string;       // free-text
  style: 'concise' | 'descriptive';
}

const SYSTEM = `You are an expert JEE & NEET tutor with deep mastery of NCERT, HC Verma, DC Pandey, MS Chouhan, NCERT Biology and full Indian competitive-exam syllabi for classes 11 and 12.
Generate exam-ready SHORT NOTES for the requested chapter. Output STRICT JSON ONLY (no markdown fences, no commentary) matching this shape:
{
  "title": string,
  "summary": string,                       // 2-3 sentence overview
  "sections": [                            // ordered conceptual sections
    { "heading": string, "body": string }  // body uses plain text + simple math like x^2, H2O, m/s^2
  ],
  "important_points": string[],            // 6-12 highest-yield bullets
  "formulas": [                            // key formulas (skip for biology if irrelevant)
    { "name": string, "expression": string, "note": string }
  ],
  "revision_cards": [                      // quick flashcards for last-minute revision
    { "front": string, "back": string }
  ],
  "common_mistakes": string[]              // 3-6 typical aspirant mistakes
}
Constraints by style:
- "concise": sections.body 2-4 sentences each, 4-6 sections total, 6-8 important_points, 4-6 cards.
- "descriptive": sections.body 4-7 sentences each, 6-9 sections total, 10-12 important_points, 8-10 cards.
Never invent fake formulas. Use real syllabus content only. Keep math readable as plain text.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const { exam, classLevel, subject, chapter, style } = body || ({} as Body);

    if (!chapter || !subject || !exam || !classLevel || !style) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (style !== 'concise' && style !== 'descriptive') {
      return new Response(JSON.stringify({ error: 'Invalid style' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = `Exam: ${exam}
Class: ${classLevel}
Subject: ${subject}
Chapter: ${chapter}
Style: ${style}

Produce the JSON now.`;

    // Retry up to 3 times with 5s delay
    let lastErr = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit reached. Please try again in a minute.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!resp.ok) {
          lastErr = `AI returned ${resp.status}`;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const data = await resp.json();
        const text: string = data?.choices?.[0]?.message?.content ?? '';
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          // attempt to extract JSON object
          const m = text.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : null;
        }
        if (!parsed) {
          lastErr = 'AI returned non-JSON';
          if (attempt < 3) await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        return new Response(JSON.stringify({ notes: parsed }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        lastErr = e?.message || 'unknown error';
        if (attempt < 3) await new Promise((r) => setTimeout(r, 5000));
      }
    }

    return new Response(JSON.stringify({ error: `Failed after retries: ${lastErr}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
