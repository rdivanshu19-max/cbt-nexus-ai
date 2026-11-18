// Reads an MCQ answer key out of whatever shape the model returns.
//
// Taking the first character of the raw value silently turned "Option B" into
// "O" and "Answer: D" into "A", so a paper could be scored against a key it
// never stated. This returns only a real option letter, or null when the key
// cannot be read - callers must then drop the question rather than guess.
export type McqKey = "A" | "B" | "C" | "D";

const LETTERS: McqKey[] = ["A", "B", "C", "D"];

const isKey = (value: string): value is McqKey => (LETTERS as string[]).includes(value);

export function normaliseAnswerKey(value: unknown): McqKey | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toUpperCase();
  if (!text) return null;

  // "A", "(C)", "D)"
  const bare = /^\(?([A-D])\)?$/.exec(text);
  if (bare) return bare[1] as McqKey;

  // "B. 12", "C) sodium chloride", "D - 4", "A: option text"
  const leading = /^([A-D])[).:\-\s]/.exec(text);
  if (leading) return leading[1] as McqKey;

  // "Option B", "OPT D", "Answer: D", "Correct answer - C", "Ans. A"
  const labelled = /^(?:OPTION|OPT|ANSWER|ANS|CORRECT\s+ANSWER)\s*[).:-]?\s*\(?([A-D])\)?\b/.exec(text);
  if (labelled) return labelled[1] as McqKey;

  return null;
}

export { isKey as isMcqKey };
