import { describe, expect, it } from "vitest";
import { answersMatch, normalizeAnswer } from "@/lib/answers";

/**
 * Regression guard for the single answer-comparison rule.
 *
 * Before this helper existed, TestTaking compared integer answers numerically
 * while Results and the Error Book compared raw strings, so one screen could
 * call an answer right and another call the same answer wrong.
 */
describe("answersMatch", () => {
  it("matches MCQ answers case- and whitespace-insensitively", () => {
    expect(answersMatch("b", "B")).toBe(true);
    expect(answersMatch(" B ", "b")).toBe(true);
    expect(answersMatch("A", "B")).toBe(false);
  });

  it("treats an unanswered question as not correct", () => {
    expect(answersMatch(null, "A")).toBe(false);
    expect(answersMatch("", "A")).toBe(false);
    expect(answersMatch("   ", "A")).toBe(false);
  });

  it("treats a missing answer key as not correct instead of guessing", () => {
    expect(answersMatch("A", null)).toBe(false);
    expect(answersMatch("A", "")).toBe(false);
    expect(answersMatch("42", null, "integer")).toBe(false);
  });

  it("compares integer answers numerically, ignoring leading zeros", () => {
    expect(answersMatch("7", "7", "integer")).toBe(true);
    expect(answersMatch("07", "7", "integer")).toBe(true);
    expect(answersMatch("7", " 7 ", "integer")).toBe(true);
    expect(answersMatch("8", "7", "integer")).toBe(false);
  });

  it("never matches non-numeric integer answers", () => {
    expect(answersMatch("A", "A", "integer")).toBe(false);
    expect(answersMatch("x", "7", "integer")).toBe(false);
  });
});

describe("normalizeAnswer", () => {
  it("trims, upper-cases and survives null", () => {
    expect(normalizeAnswer(" b ")).toBe("B");
    expect(normalizeAnswer(null)).toBe("");
    expect(normalizeAnswer(undefined)).toBe("");
  });
});
