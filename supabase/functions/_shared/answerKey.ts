// Answer-key normalisation for the PDF → CBT pipeline.
//
// The extraction prompt asks the model to return `correctAnswer` as a single
// letter, and to return null when the paper carries no visible key. Models do
// not obey that literally: real responses contain "Option B", "(C)", "d)",
// "Answer: A", "B. 12" or "" . Taking `.charAt(0)` of those produced keys like
// "O" (from "Option B") or "A" (from "Answer: D"), which silently scored every
// student against a wrong key. This module turns any of those shapes into a
// real choice, and returns null when no choice can be determined — so callers
// can count and report unverified questions instead of pretending they are known.

export type Choice = "A" | "B" | "C" | "D";

const CHOICES: Choice[] = ["A", "B", "C", "D"];

/**
 * Normalises an AI-supplied answer into "A" | "B" | "C" | "D", or null when the
 * value does not name exactly one option.
 *
 * Accepted shapes: "A", " a ", "(B)", "Option C", "opt d", "Answer: B",
 * "D)", "B. 12", "C -", "A,B" is rejected because it names two options.
 */
export const normaliseAnswer = (value: unknown): Choice | null => {
  if (value === null || value === undefined) return null;

  // A bare number (1-4) is ambiguous — it may be an option index or a numeric
  // answer — so it is deliberately not guessed at.
  const text = String(value).trim().toUpperCase();
  if (!text) return null;

  if (text.length === 1) {
    return CHOICES.includes(text as Choice) ? (text as Choice) : null;
  }

  // Drop the words that precede a choice in free-form answers, then read the
  // first standalone A-D letter. "OPTION B" → "B", "ANSWER: D" → "D",
  // "BECAUSE" → no match (the letter is followed by another letter).
  const stripped = text
    .replace(/^[\s([{.:#-]+/, "")
    .replace(/^(?:THE\s+)?(?:CORRECT\s+)?(?:ANSWER|OPTION|OPT|CHOICE|ANS)\b[\s.:#-]*/g, "")
    .replace(/^[\s([{.:#-]+/, "");

  // Count the standalone A-D letters. Exactly one means the answer is
  // unambiguous; two or more ("A or B", "A, C") must not be guessed at.
  const mentioned = new Set(
    (stripped.match(/(?:^|[^A-Z])([A-D])(?![A-Z])/g) ?? []).map((m) => m.trim().slice(-1)),
  );
  if (mentioned.size === 1) return [...mentioned][0] as Choice;

  return null;
};

/**
 * Maps extracted questions onto insertable rows, tracking how many of them had
 * no determinable answer key. `fallback` keeps the database's NOT NULL
 * `correct_answer` constraint satisfied; the returned count is what callers must
 * surface so an unverified key is never presented as a real one.
 */
export const applyAnswerKeys = <T extends { correctAnswer?: unknown; correct_answer?: unknown }>(
  questions: T[],
  fallback: Choice = "A",
): { answers: Choice[]; unverified: number } => {
  const answers: Choice[] = [];
  let unverified = 0;

  for (const question of questions) {
    const raw = question?.correctAnswer ?? question?.correct_answer ?? null;
    const choice = normaliseAnswer(raw);
    if (choice) {
      answers.push(choice);
    } else {
      unverified += 1;
      answers.push(fallback);
    }
  }

  return { answers, unverified };
};
