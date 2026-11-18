import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guard for the Error Book.
 *
 * syncErrorBook() is called with every question of an attempt. It used to skip
 * only *unanswered* questions, so correctly answered questions were filed as
 * mistakes and pushed into the revision queue.
 */

const inserted: unknown[] = [];
const existing: { question_id: string }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: table === "error_book" ? existing : [], error: null }),
        }),
      }),
      insert: (rows: unknown) => {
        inserted.push(...(Array.isArray(rows) ? rows : [rows]));
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

const { syncErrorBook } = await import("@/lib/errorBook");

const question = (id: string, correct_answer: string, question_type = "mcq") => ({
  id,
  question_text: `Question ${id}`,
  option_a: "a",
  option_b: "b",
  option_c: "c",
  option_d: "d",
  correct_answer,
  question_type,
});

describe("syncErrorBook", () => {
  beforeEach(() => {
    inserted.length = 0;
    existing.length = 0;
  });

  it("stores only wrongly answered questions", async () => {
    const questions = [
      question("q1", "A"), // answered correctly
      question("q2", "B"), // answered wrongly
      question("q3", "C"), // skipped
    ];
    const responses = [
      { question_id: "q1", selected_answer: "A" },
      { question_id: "q2", selected_answer: "D" },
      { question_id: "q3", selected_answer: null },
    ];

    const count = await syncErrorBook("user-1", "attempt-1", questions, responses);

    expect(count).toBe(1);
    expect(inserted).toHaveLength(1);
    expect((inserted[0] as { question_id: string }).question_id).toBe("q2");
  });

  it("treats a numerically equal integer answer as correct", async () => {
    const questions = [question("q1", "7", "integer"), question("q2", "12", "integer")];
    const responses = [
      { question_id: "q1", selected_answer: "07" },
      { question_id: "q2", selected_answer: "11" },
    ];

    const count = await syncErrorBook("user-1", "attempt-1", questions, responses);

    expect(count).toBe(1);
    expect((inserted[0] as { question_id: string }).question_id).toBe("q2");
  });

  it("skips questions already filed for this attempt", async () => {
    existing.push({ question_id: "q2" });
    const questions = [question("q2", "B")];
    const responses = [{ question_id: "q2", selected_answer: "A" }];

    const count = await syncErrorBook("user-1", "attempt-1", questions, responses);

    expect(count).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});
