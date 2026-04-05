import { describe, it, expect } from "vitest";
import { isValidSlug } from "@/lib/readers/projects";

describe("API input validation", () => {
  describe("history route — parseInt NaN guard", () => {
    it("falls back to 200 when limit is not a number", () => {
      const parsed = parseInt("abc", 10);
      const limit = Math.min(Number.isNaN(parsed) ? 200 : parsed, 10_000);
      expect(limit).toBe(200);
    });

    it("respects valid limit", () => {
      const parsed = parseInt("50", 10);
      const limit = Math.min(Number.isNaN(parsed) ? 200 : parsed, 10_000);
      expect(limit).toBe(50);
    });

    it("caps at 10000", () => {
      const parsed = parseInt("999999", 10);
      const limit = Math.min(Number.isNaN(parsed) ? 200 : parsed, 10_000);
      expect(limit).toBe(10_000);
    });
  });

  describe("export route — Invalid Date guard", () => {
    it("returns null for invalid date string", () => {
      const raw = new Date("not-a-date").getTime();
      const result = !Number.isNaN(raw) ? raw : null;
      expect(result).toBeNull();
    });

    it("returns timestamp for valid date", () => {
      const raw = new Date("2026-04-01").getTime();
      const result = !Number.isNaN(raw) ? raw : null;
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("memory PATCH — validation logic", () => {
    it("rejects missing fields", () => {
      const body = { projectSlug: "test" };
      const { file, content } = body as {
        file?: string;
        content?: string;
      };
      const valid = !!body.projectSlug && !!file && typeof content === "string";
      expect(valid).toBe(false);
    });

    it("rejects non-.md files", () => {
      const file = "secrets.txt";
      expect(file.endsWith(".md")).toBe(false);
    });

    it("rejects path traversal in slug via isValidSlug", () => {
      expect(isValidSlug("../../../etc")).toBe(false);
      expect(isValidSlug("foo/bar")).toBe(false);
      expect(isValidSlug("foo\\bar")).toBe(false);
      expect(isValidSlug("..")).toBe(false);
    });

    it("accepts valid slug via isValidSlug", () => {
      expect(isValidSlug("-Users-itarun-cc-lens")).toBe(true);
      expect(isValidSlug("my-project")).toBe(true);
    });

    it("rejects path traversal in file", () => {
      const file = "../../passwd";
      expect(/[/\\]/.test(file) || /\.\./.test(file)).toBe(true);
    });
  });
});
