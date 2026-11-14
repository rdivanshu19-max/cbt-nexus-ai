import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard for a security invariant on the Supabase Edge Functions.
 *
 * Edge Functions are reachable by anyone holding the project's publishable
 * (anon) key, because that key is itself a valid JWT. A function that spends
 * the project's AI credits - or writes with the service-role key - must
 * therefore verify that the caller is a signed-in user before doing any work.
 *
 * These checks are static so they run without a Deno runtime.
 */

const FUNCTIONS_DIR = resolve(process.cwd(), "supabase/functions");

/** Functions that call requireUser() and read the request body afterwards. */
const CREDIT_SPENDING_FUNCTIONS = [
  "generate-test/index.ts",
  "generate-short-notes/index.ts",
  "nexus-ai-chat/index.ts",
];

/** Functions with their own inline session check. */
const INLINE_AUTH_FUNCTIONS = [
  "process-pdf-test/index.ts",
  "delete-test/index.ts",
  "delete-account/index.ts",
  "series-access/index.ts",
];

const source = (relativePath: string) => readFileSync(resolve(FUNCTIONS_DIR, relativePath), "utf8");

describe("edge function authentication", () => {
  it.each(CREDIT_SPENDING_FUNCTIONS)("%s verifies the caller's session", (fn) => {
    expect(source(fn)).toContain("requireUser(");
  });

  it.each(CREDIT_SPENDING_FUNCTIONS)("%s checks the session before handling the request body", (fn) => {
    const code = source(fn);
    const authCall = code.indexOf("requireUser(");
    const bodyRead = code.indexOf("await req.json()");
    expect(authCall).toBeGreaterThan(-1);
    expect(bodyRead).toBeGreaterThan(-1);
    expect(authCall).toBeLessThan(bodyRead);
  });

  it.each(INLINE_AUTH_FUNCTIONS)("%s verifies the session itself", (fn) => {
    expect(source(fn)).toContain("auth.getUser()");
  });

  it("does not trust a client-supplied user id as the creator of a test", () => {
    const code = source("generate-test/index.ts");
    expect(code).not.toContain("created_by: body.userId");
    expect(code).toContain("created_by: userId");
  });

  it("ships a shared auth helper that rejects missing or invalid sessions", () => {
    const helper = source("_shared/auth.ts");
    expect(helper).toContain("auth.getUser()");
    expect(helper).toContain("401");
  });
});
