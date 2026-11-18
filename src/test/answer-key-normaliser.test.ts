import { describe, expect, it } from "vitest";
import { isMcqKey, normaliseAnswerKey } from "../../supabase/functions/_shared/answerKey";

/**
 * Guards for answer-key normalisation.
 *
 * The extractor used to take charAt(0) of the model's answer, so "Option B"
 * became "O" and "Answer: D" became "A" - a key the paper never stated.
 */
describe("normaliseAnswerKey", () => {
  it("accepts a bare letter in either case", () => {
    expect(normaliseAnswerKey("A")).toBe("A");
    expect(normaliseAnswerKey(" b ")).toBe("B");
    expect(normaliseAnswerKey("(C)")).toBe("C");
    expect(normaliseAnswerKey("D)")).toBe("D");
  });

  it("reads the letter out of the shapes the model actually returns", () => {
    expect(normaliseAnswerKey("Option B")).toBe("B");
    expect(normaliseAnswerKey("opt d")).toBe("D");
    expect(normaliseAnswerKey("Answer: D")).toBe("D");
    expect(normaliseAnswerKey("Correct answer - C")).toBe("C");
    expect(normaliseAnswerKey("B. 12")).toBe("B");
    expect(normaliseAnswerKey("C) sodium chloride")).toBe("C");
    expect(normaliseAnswerKey("Ans. A")).toBe("A");
  });

  it("never invents a letter", () => {
    expect(normaliseAnswerKey("Option B")).not.toBe("O");
    expect(normaliseAnswerKey("Answer: D")).not.toBe("A");
    expect(normaliseAnswerKey("BECAUSE")).toBeNull();
    expect(normaliseAnswerKey("E")).toBeNull();
  });

  it("returns null when the key is missing or unreadable", () => {
    expect(normaliseAnswerKey(null)).toBeNull();
    expect(normaliseAnswerKey(undefined)).toBeNull();
    expect(normaliseAnswerKey("")).toBeNull();
    expect(normaliseAnswerKey("   ")).toBeNull();
    expect(normaliseAnswerKey("not visible")).toBeNull();
    expect(normaliseAnswerKey(3)).toBeNull();
  });
});

describe("isMcqKey", () => {
  it("accepts only A-D", () => {
    expect(isMcqKey("A")).toBe(true);
    expect(isMcqKey("D")).toBe(true);
    expect(isMcqKey("E")).toBe(false);
    expect(isMcqKey("42")).toBe(false);
  });
});
