import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static regression guards for today's hardening.
 *
 * 1. nexus-ai-chat forwarded the caller's `messages` array straight into the
 *    paid gateway. A caller could prepend a "system" turn and replace Nexus AI's
 *    instructions, or send an enormous transcript and drain the credits.
 * 2. generate-test trusted `count`, `integerCount` and `startNumber`, each of
 *    which buys one AI call.
 * 3. generate-test skipped its ownership check whenever `created_by` was null,
 *    so any signed-in student could append questions to an admin or series test.
 */

const FUNCTIONS_DIR = resolve(process.cwd(), "supabase/functions");
const source = (relativePath: string) => readFileSync(resolve(FUNCTIONS_DIR, relativePath), "utf8");

describe("nexus-ai-chat message sanitisation", () => {
  const code = source("nexus-ai-chat/index.ts");

  it("filters the caller's messages before forwarding them", () => {
    expect(code).toContain("const messages = sanitizeMessages(payload?.messages);");
    expect(code).not.toContain("const { messages } = await req.json();");
  });

  it("accepts only user and assistant turns", () => {
    expect(code).toContain('if (role !== "user" && role !== "assistant") continue;');
  });

  it("bounds the transcript and each message", () => {
    expect(code).toContain("const MAX_MESSAGES = 20;");
    expect(code).toContain("const MAX_MESSAGE_CHARS = 4000;");
  });

  it("rejects an empty transcript instead of paying for a call", () => {
    expect(code).toContain("if (messages.length === 0)");
  });
});

describe("generate-test request bounds", () => {
  const code = source("generate-test/index.ts");

  it("clamps the batch size instead of trusting the client", () => {
    expect(code).toContain("const count = clamp(toInt(body.count, 0), 1, 25);");
  });

  it("clamps integer count and start number", () => {
    expect(code).toContain("clamp(toInt(integerCount, 0), 0, count)");
    expect(code).toContain("clamp(toInt(startNumber, 1), 1, 500)");
  });

  it("validates the create-phase title, duration and marks", () => {
    expect(code).toContain("if (!title) {");
    expect(code).toContain("const duration = clamp(toInt(body.duration, 60), 1, 600);");
    expect(code).toContain("const marks = clamp(toInt(body.marks, 0), 0, 2000);");
  });

  it("treats a null created_by as admin-owned", () => {
    expect(code).toContain("if (owner.created_by !== userId) {");
    expect(code).not.toContain("if (owner.created_by && owner.created_by !== userId)");
  });
});
