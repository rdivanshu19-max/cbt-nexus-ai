import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static regression guards for today's fixes.
 *
 * 1. process-pdf-test reads a caller-supplied storage path with the service-role
 *    key, which bypasses storage RLS. A non-admin must be confined to their own
 *    `${userId}/` folder.
 * 2. TestTaking used to parse the local draft a second time outside its
 *    try/catch. One corrupt entry threw before setLoading(false), leaving the
 *    exam screen on a spinner forever.
 * 3. The private test-pdfs bucket shipped with bucket-wide SELECT/INSERT
 *    policies, exposing every paper and every admin answer key.
 */

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("process-pdf-test path ownership", () => {
  const code = read("supabase/functions/process-pdf-test/index.ts");

  it("confines non-admin callers to their own storage folder", () => {
    expect(code).toContain("startsWith(`${userId}/`)");
  });

  it("checks ownership before downloading the PDF", () => {
    const ownershipCheck = code.indexOf("startsWith(`${userId}/`)");
    const download = code.indexOf('from("test-pdfs").download(filePath)');
    expect(ownershipCheck).toBeGreaterThan(-1);
    expect(download).toBeGreaterThan(-1);
    expect(ownershipCheck).toBeLessThan(download);
  });

  it("still lets admins read admin/ answer keys", () => {
    expect(code).toContain("if (!isAdmin) {\n      const pathsAreOwned");
  });
});

describe("TestTaking draft hydration", () => {
  const code = read("src/pages/TestTaking.tsx");

  it("never parses the stored draft outside the guarded block", () => {
    expect(code).not.toContain("JSON.parse(stored)");
  });

  it("clears a corrupt draft instead of aborting the load", () => {
    expect(code).toContain("localStorage.removeItem(storageKey)");
  });
});

describe("test-pdfs storage hardening", () => {
  const migrationPath = "supabase/migrations/20261115093000_harden_test_pdfs_storage.sql";

  it("ships a migration that drops the bucket-wide policies", () => {
    expect(existsSync(resolve(root, migrationPath))).toBe(true);
    const sql = read(migrationPath);
    expect(sql).toContain('DROP POLICY IF EXISTS "Authenticated users can view PDFs"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Authenticated users can upload PDFs"');
    expect(sql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });
});

describe("deployment security headers", () => {
  it("declares baseline headers for Netlify", () => {
    const headers = read("public/_headers");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("Referrer-Policy: strict-origin-when-cross-origin");
  });
});
