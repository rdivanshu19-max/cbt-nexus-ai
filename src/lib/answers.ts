/**
 * Single source of truth for "is this answer correct?".
 *
 * The attempt score in TestTaking and the analytics in Results and the Error
 * Book must all agree; when each screen compared strings in its own way, an
 * integer answer ("42") scored as correct in one place and wrong in another.
 */
export const normalizeAnswer = (value: string | null | undefined): string =>
  String(value ?? "").trim().toUpperCase();

/**
 * Compares a student's answer with the stored key.
 * Integer-type questions compare numerically, so "07" and "7" agree;
 * MCQ answers compare case- and whitespace-insensitively.
 */
export const answersMatch = (
  selected: string | null | undefined,
  correct: string | null | undefined,
  type?: string | null,
): boolean => {
  const chosen = normalizeAnswer(selected);
  if (!chosen) return false;
  const key = normalizeAnswer(correct);
  if (!key) return false;
  if (type === "integer") {
    const a = Number.parseInt(chosen, 10);
    const b = Number.parseInt(key, 10);
    return Number.isFinite(a) && Number.isFinite(b) && a === b;
  }
  return chosen === key;
};
