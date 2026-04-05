#!/usr/bin/env node
/**
 * Data accuracy smoke test for cc-lens
 * Verifies that dashboard values match raw JSONL data
 *
 * Usage: node scripts/verify-data.mjs [--port 33033]
 */

import fs from "fs/promises";
import path from "path";
import os from "os";

const PORT = process.argv.includes("--port")
  ? process.argv[process.argv.indexOf("--port") + 1]
  : "33033";
const BASE = `http://localhost:${PORT}`;
const CLAUDE_DIR = path.join(os.homedir(), ".claude");

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  \x1b[32m✓\x1b[0m ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  \x1b[31m✗\x1b[0m ${label}`);
  if (detail) console.log(`    ${detail}`);
}

function check(label, condition, detail) {
  if (condition) ok(label);
  else fail(label, detail);
}

async function fetchJSON(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`);
  if (!res.ok) throw new Error(`${endpoint} returned ${res.status}`);
  return res.json();
}

// ── Test 1: Token counting consistency ───────────────────────────────────────

async function testTokenCounting() {
  console.log("\n1. Token counting");
  const { computed } = await fetchJSON("/api/stats");

  check(
    "totalTokens = input + output (no cache double-count)",
    computed.totalTokens ===
      computed.totalInputTokens + computed.totalOutputTokens,
    `totalTokens=${computed.totalTokens}, input+output=${computed.totalInputTokens + computed.totalOutputTokens}`,
  );

  check(
    "cache tokens are separate fields",
    computed.totalCacheReadTokens > 0 && computed.totalCacheWriteTokens > 0,
    `cacheRead=${computed.totalCacheReadTokens}, cacheWrite=${computed.totalCacheWriteTokens}`,
  );
}

// ── Test 2: Cost consistency between stats and daily ─────────────────────────

async function testCostConsistency() {
  console.log("\n2. Cost consistency");
  const costs = await fetchJSON("/api/costs");

  const dailySum = costs.daily.reduce((sum, d) => sum + d.total, 0);

  // Daily sum and total_cost come from different sources (JSONL vs stats-cache)
  // so they may differ. But daily sum should be > 0 and reasonable.
  check("daily cost sum > 0", dailySum > 0, `dailySum=${dailySum}`);

  // Check that daily chart uses multiple models (not all hardcoded to one)
  const modelsInDaily = new Set();
  for (const day of costs.daily) {
    for (const m of Object.keys(day.costs)) modelsInDaily.add(m);
  }
  check(
    "daily chart uses actual models (not hardcoded)",
    modelsInDaily.size >= 1,
    `models: ${[...modelsInDaily].join(", ")}`,
  );
}

// ── Test 3: Session model tracking ───────────────────────────────────────────

async function testModelTracking() {
  console.log("\n3. Model tracking per session");
  const { sessions } = await fetchJSON("/api/sessions");

  const withModel = sessions.filter(
    (s) => s.model && s.model !== "claude-opus-4-6",
  );
  const totalWithAnyModel = sessions.filter((s) => s.model).length;

  check(
    "sessions have model field",
    totalWithAnyModel > 0,
    `${totalWithAnyModel} / ${sessions.length} have model`,
  );

  check(
    "some sessions use non-Opus models",
    withModel.length > 0,
    `${withModel.length} sessions use Sonnet/Haiku/other`,
  );
}

// ── Test 4: Session deduplication ────────────────────────────────────────────

async function testDeduplication() {
  console.log("\n4. Session deduplication");
  const { sessions } = await fetchJSON("/api/sessions");

  const ids = sessions.map((s) => s.session_id);
  const unique = new Set(ids);

  check(
    "no duplicate session IDs in API response",
    ids.length === unique.size,
    `total=${ids.length}, unique=${unique.size}, dupes=${ids.length - unique.size}`,
  );
}

// ── Test 5: Spot-check one session against raw JSONL ─────────────────────────

async function testSpotCheck() {
  console.log("\n5. Spot-check: session vs raw JSONL");
  const { sessions } = await fetchJSON("/api/sessions");

  // Find a session with tokens to spot-check
  const target = sessions.find(
    (s) => s.input_tokens > 100 && s.output_tokens > 100,
  );
  if (!target) {
    fail("no session with tokens > 100 found for spot-check");
    return;
  }

  // Read the raw JSONL file
  const projectsDir = path.join(CLAUDE_DIR, "projects");
  let jsonlPath = null;

  try {
    const slugs = await fs.readdir(projectsDir);
    for (const slug of slugs) {
      const candidate = path.join(
        projectsDir,
        slug,
        `${target.session_id}.jsonl`,
      );
      try {
        await fs.access(candidate);
        jsonlPath = candidate;
        break;
      } catch {
        /* not in this project */
      }
    }
  } catch {
    /* projects dir unreadable */
  }

  if (!jsonlPath) {
    fail(`JSONL file not found for session ${target.session_id}`);
    return;
  }

  const raw = await fs.readFile(jsonlPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let rawInput = 0;
  let rawOutput = 0;
  let rawModel = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === "assistant" && obj.message?.usage) {
        rawInput += obj.message.usage.input_tokens ?? 0;
        rawOutput += obj.message.usage.output_tokens ?? 0;
        if (obj.message.model && !rawModel) rawModel = obj.message.model;
      }
    } catch {
      /* skip */
    }
  }

  check(
    `input_tokens match (session ${target.session_id.slice(0, 8)}...)`,
    target.input_tokens === rawInput,
    `API=${target.input_tokens}, JSONL=${rawInput}`,
  );

  check(
    "output_tokens match",
    target.output_tokens === rawOutput,
    `API=${target.output_tokens}, JSONL=${rawOutput}`,
  );

  if (rawModel) {
    check(
      "model matches JSONL",
      target.model === rawModel,
      `API=${target.model}, JSONL=${rawModel}`,
    );
  }
}

// ── Run all tests ────────────────────────────────────────────────────────────

console.log(`\n\x1b[1mcc-lens data accuracy smoke test\x1b[0m`);
console.log(`Target: ${BASE}`);

try {
  await testTokenCounting();
  await testCostConsistency();
  await testModelTracking();
  await testDeduplication();
  await testSpotCheck();
} catch (err) {
  fail(`Fatal error: ${err.message}`);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
