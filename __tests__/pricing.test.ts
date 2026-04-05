import { describe, it, expect } from "vitest";
import {
  estimateCostFromUsage,
  estimateCostFromSessionMeta,
  estimateTotalCostFromModel,
  cacheEfficiency,
  getPricing,
  PRICING,
} from "@/lib/pricing";
import type { TurnUsage, ModelUsage } from "@/types/claude";

function turnUsage(overrides: Partial<TurnUsage> = {}): TurnUsage {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    ...overrides,
  };
}

function modelUsage(overrides: Partial<ModelUsage> = {}): ModelUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUSD: 0,
    webSearchRequests: 0,
    ...overrides,
  };
}

describe("getPricing", () => {
  it("returns exact match for known models", () => {
    const p = getPricing("claude-opus-4-6");
    expect(p).toBe(PRICING["claude-opus-4-6"]);
  });

  it("returns exact match for haiku", () => {
    const p = getPricing("claude-haiku-4-5");
    expect(p).toBe(PRICING["claude-haiku-4-5"]);
  });

  it("fuzzy matches model with date suffix", () => {
    const p = getPricing("claude-haiku-4-5-20251001");
    expect(p.input).toBe(PRICING["claude-haiku-4-5"].input);
  });

  it("falls back to opus for unknown models", () => {
    const p = getPricing("claude-unknown-99");
    expect(p).toBe(PRICING["claude-opus-4-6"]);
  });

  it("falls back to opus for empty string", () => {
    const p = getPricing("");
    expect(p).toBe(PRICING["claude-opus-4-6"]);
  });
});

describe("estimateCostFromUsage", () => {
  it("calculates cost with all 4 token types", () => {
    const cost = estimateCostFromUsage(
      "claude-opus-4-6",
      turnUsage({
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        cache_read_input_tokens: 1_000_000,
      }),
    );
    const p = PRICING["claude-opus-4-6"];
    const expected =
      1e6 * p.input + 1e6 * p.output + 1e6 * p.cacheWrite + 1e6 * p.cacheRead;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it("handles zero tokens", () => {
    const cost = estimateCostFromUsage("claude-opus-4-6", turnUsage());
    expect(cost).toBe(0);
  });

  it("uses correct model pricing (haiku vs opus)", () => {
    const usage = turnUsage({
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    const opusCost = estimateCostFromUsage("claude-opus-4-6", usage);
    const haikuCost = estimateCostFromUsage("claude-haiku-4-5", usage);
    expect(opusCost).toBeGreaterThan(haikuCost * 10);
  });
});

describe("estimateCostFromSessionMeta", () => {
  it("calculates cost from input + output only", () => {
    const cost = estimateCostFromSessionMeta(
      "claude-sonnet-4-6",
      1_000_000,
      500_000,
    );
    const p = PRICING["claude-sonnet-4-6"];
    expect(cost).toBeCloseTo(1e6 * p.input + 5e5 * p.output, 6);
  });
});

describe("estimateTotalCostFromModel", () => {
  it("includes all 4 token types from ModelUsage", () => {
    const cost = estimateTotalCostFromModel(
      "claude-opus-4-6",
      modelUsage({
        inputTokens: 1000,
        outputTokens: 2000,
        cacheCreationInputTokens: 500,
        cacheReadInputTokens: 300,
      }),
    );
    const p = PRICING["claude-opus-4-6"];
    const expected =
      1000 * p.input + 2000 * p.output + 500 * p.cacheWrite + 300 * p.cacheRead;
    expect(cost).toBeCloseTo(expected, 10);
  });
});

describe("cacheEfficiency", () => {
  it("calculates savings and hit rate", () => {
    const result = cacheEfficiency(
      "claude-opus-4-6",
      modelUsage({
        inputTokens: 500,
        outputTokens: 1000,
        cacheCreationInputTokens: 200,
        cacheReadInputTokens: 800,
      }),
    );
    expect(result.hitRate).toBeCloseTo(800 / (500 + 800), 4);
    expect(result.savedUSD).toBeGreaterThan(0);
    expect(result.wouldHavePaidUSD).toBeGreaterThan(0);
  });

  it("returns 0 hit rate when no tokens", () => {
    const result = cacheEfficiency("claude-opus-4-6", modelUsage());
    expect(result.hitRate).toBe(0);
    expect(result.savedUSD).toBe(0);
  });
});
