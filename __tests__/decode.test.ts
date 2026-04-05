import { describe, it, expect } from "vitest";
import {
  slugToPath,
  pathToSlug,
  projectDisplayName,
  projectShortPath,
  formatTokens,
  formatCost,
  formatBytes,
  formatDuration,
  formatPct,
} from "@/lib/decode";

describe("slugToPath", () => {
  it("converts slug to filesystem path", () => {
    expect(slugToPath("-Users-foo-bar-myproject")).toBe(
      "/Users/foo/bar/myproject",
    );
  });

  it("handles empty string", () => {
    expect(slugToPath("")).toBe("");
  });
});

describe("pathToSlug", () => {
  it("converts path to slug", () => {
    expect(pathToSlug("/Users/foo/bar")).toBe("-Users-foo-bar");
  });

  it("roundtrips with slugToPath for paths without hyphens", () => {
    const p = "/Users/foo/myproject";
    expect(slugToPath(pathToSlug(p))).toBe(p);
  });
});

describe("projectDisplayName", () => {
  it("returns last path segment", () => {
    expect(projectDisplayName("/Users/foo/myproject")).toBe("myproject");
  });

  it("returns Unknown for empty string", () => {
    expect(projectDisplayName("")).toBe("Unknown");
  });

  it("handles trailing slash", () => {
    expect(projectDisplayName("/Users/foo/bar/")).toBe("bar");
  });
});

describe("projectShortPath", () => {
  it("returns last 2 segments with ellipsis", () => {
    expect(projectShortPath("/Users/foo/bar/baz")).toBe(".../bar/baz");
  });

  it("returns full path if <= 2 segments", () => {
    expect(projectShortPath("/foo")).toBe("/foo");
  });

  it("returns Unknown for empty", () => {
    expect(projectShortPath("")).toBe("Unknown");
  });
});

describe("formatTokens", () => {
  it("formats billions", () => {
    expect(formatTokens(1_500_000_000)).toBe("1.5B");
  });

  it("formats millions", () => {
    expect(formatTokens(26_000_000)).toBe("26.0M");
  });

  it("formats thousands", () => {
    expect(formatTokens(4_500)).toBe("4.5K");
  });

  it("formats small numbers as-is", () => {
    expect(formatTokens(42)).toBe("42");
  });

  it("formats zero", () => {
    expect(formatTokens(0)).toBe("0");
  });
});

describe("formatCost", () => {
  it("formats zero", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats tiny amounts with 4 decimals", () => {
    expect(formatCost(0.0012)).toBe("$0.0012");
  });

  it("formats sub-dollar with 3 decimals", () => {
    expect(formatCost(0.456)).toBe("$0.456");
  });

  it("formats dollars with 2 decimals", () => {
    expect(formatCost(123.456)).toBe("$123.46");
  });
});

describe("formatBytes", () => {
  it("formats GB", () => {
    expect(formatBytes(5_000_000_000)).toBe("4.66 GB");
  });

  it("formats MB", () => {
    expect(formatBytes(2_500_000)).toBe("2.38 MB");
  });

  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });
});

describe("formatDuration", () => {
  it("formats sub-minute", () => {
    expect(formatDuration(0.5)).toBe("<1m");
  });

  it("formats minutes", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("formats exact hours", () => {
    expect(formatDuration(120)).toBe("2h");
  });
});

describe("formatPct", () => {
  it("formats percentage", () => {
    expect(formatPct(25, 100)).toBe("25.0%");
  });

  it("returns 0% for zero total", () => {
    expect(formatPct(10, 0)).toBe("0%");
  });
});
