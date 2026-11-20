import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyAnswerKeys, normaliseAnswer } from "../../supabase/functions/_shared/answerKey";

/**
 * Guards for the 2026-11-17 PDF → CBT answer-key fix.
 *
 * The extractor used to store `String(correctAnswer).trim().toUpperCase().charAt(0)`,
 * so "Option B" became "O" and "Answer: D" became "A", and a question with no
 * visible key silently became "A". Every student was then scored against a key
 * the paper never stated.
 */

describe("normaliseAnswer", () => {
  it("accepts a bare letter in either case and with surrounding noise", () => {
    expect(normaliseAnswer("A")).toBe("A");
    expect(normaliseAnswer(" b ")).toBe("B");
    expect(normaliseAnswer("(C)")).toBe("C");
    expect(normaliseAnswer("D)")).toBe("D");
  });

  it("reads the letter out of the shapes the model actually returns", () => {
    expect(normaliseAnswer("Option B")).toBe("B");
    expect(normaliseAnswer("opt d")).toBe("D");
    expect(normaliseAnswer("Answer: D")).toBe("D");
    expect(normaliseAnswer("Correct answer - C")).toBe("C");
    expect(normaliseAnswer("B. 12")).toBe("B");
    expect(normaliseAnswer("C) sodium chloride")).toBe("C");
  });

  it("never returns a letter that is not an option", () => {
    expect(normaliseAnswer("Option B")).not.toBe("O");
    expect(normaliseAnswer("Answer: D")).not.toBe("A");
  });

  it("returns null when the key is missing or unreadable", () => {
    expect(normaliseAnswer(null)).toBeNull();
    expect(normaliseAnswer(undefined)).toBeNull();
    expect(normaliseAnswer("")).toBeNull();
    expect(normaliseAnswer("   ")).toBeNull();
    expect(normaliseAnswer("not visible")).toBeNull();
    expect(normaliseAnswer("BECAUSE")).toBeNull();
    expect(normaliseAnswer(3)).toBeNull();
  });

  it("refuses to guess when the value names more than one option", () => {
    expect(normaliseAnswer("A or B")).toBeNull();
    expect(normaliseAnswer("A, C")).toBeNull();
  });
});

describe("applyAnswerKeys", () => {
  it("counts the questions whose key could not be read", () => {
    const result = applyAnswerKeys([
      { correctAnswer: "B" },
      { correctAnswer: null },
      { correctAnswer: "Option C" },
      { correct_answer: "x" },
    ]);
    expect(result.answers).toEqual(["B", "A", "C", "A"]);
    expect(result.unverified).toBe(2);
  });

  it("reports zero unverified questions for a complete key", () => {
    const result = applyAnswerKeys([{ correctAnswer: "A" }, { correctAnswer: "D" }]);
    expect(result.unverified).toBe(0);
  });
});

describe("process-pdf-test uses the normaliser", () => {
  const code = readFileSync(resolve(process.cwd(), "supabase/functions/process-pdf-test/index.ts"), "utf8");

  it("no longer takes charAt(0) of the model's answer", () => {
    expect(code).not.toContain(".toUpperCase().charAt(0)");
  });

  it("imports the shared normaliser", () => {
    expect(code).toContain('from "../_shared/answerKey.ts"');
  });

  it("surfaces unverified answer keys instead of hiding them", () => {
    expect(code).toContain("unverifiedAnswers");
    expect(code).toContain("answer_key_verified");
  });
});

describe("delete-account fails closed", () => {
  const code = readFileSync(resolve(process.cwd(), "supabase/functions/delete-account/index.ts"), "utf8");

  it("checks every delete result", () => {
    expect(code).toContain("const wipe = async (");
    expect(code).toContain("if (error) failures.push(");
  });

  it("keeps the account when data cleanup fails", () => {
    const guard = code.indexOf("if (failures.length > 0)");
    const deleteUser = code.indexOf("admin.auth.admin.deleteUser(userId)");
    expect(guard).toBeGreaterThan(-1);
    expect(deleteUser).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(deleteUser);
  });
});

describe("exam timer is clamped", () => {
  const code = readFileSync(resolve(process.cwd(), "src/pages/TestTaking.tsx"), "utf8");

  it("never counts below zero", () => {
    expect(code).toContain("Math.max(0, t - 1)");
  });

  it("never records more time than the paper allows", () => {
    expect(code).toContain("Math.min(test.duration_minutes * 60");
  });
});
