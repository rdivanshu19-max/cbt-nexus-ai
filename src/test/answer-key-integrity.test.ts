import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard for answer-key and account-deletion integrity in the edge
 * functions. Static checks, so they run without a Deno runtime.
 */

const FUNCTIONS_DIR = resolve(process.cwd(), "supabase/functions");
const source = (relativePath: string) => readFileSync(resolve(FUNCTIONS_DIR, relativePath), "utf8");

describe("answer keys are never guessed", () => {
  it.each(["process-pdf-test/index.ts", "generate-test/index.ts"])(
    "%s does not default a missing answer to 'A'",
    (fn) => {
      const code = source(fn);
      expect(code).not.toMatch(/correct_answer[^\n]*\|\|\s*["']A["']/);
    },
  );

  it("process-pdf-test drops questions whose answer is not A-D and reports them", () => {
    const code = source("process-pdf-test/index.ts");
    expect(code).toContain("MCQ_KEYS");
    expect(code).toContain("keyedQuestions");
    expect(code).toContain("skippedForMissingKey");
  });

  it("generate-test reports how many generated questions were unusable", () => {
    const code = source("generate-test/index.ts");
    expect(code).toContain("skipped:");
    expect(code).toMatch(/\["A", "B", "C", "D"\]\.includes/);
  });
});

describe("account deletion", () => {
  it("purges the user's stored files before removing the account", () => {
    const code = source("delete-account/index.ts");
    expect(code).toContain("purgeUserStorage(");
    expect(code).toContain("test-pdfs");
    expect(code).toContain("question-images");
    const purgeAt = code.indexOf("await purgeUserStorage(");
    const deleteAt = code.indexOf("auth.admin.deleteUser(");
    expect(purgeAt).toBeGreaterThan(-1);
    expect(purgeAt).toBeLessThan(deleteAt);
  });
});
