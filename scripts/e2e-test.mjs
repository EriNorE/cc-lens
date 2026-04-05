#!/usr/bin/env node
/**
 * Playwright E2E test for cc-lens dashboard
 * Verifies all major pages load, data displays correctly,
 * and key interactions work.
 *
 * Usage: node scripts/e2e-test.mjs [--port 33033]
 */

import { chromium } from "playwright";

const PORT = process.argv.includes("--port")
  ? process.argv[process.argv.indexOf("--port") + 1]
  : "33033";
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
const screenshots = [];

function ok(label) {
  passed++;
  console.log(`  \x1b[32m✓\x1b[0m ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  \x1b[31m✗\x1b[0m ${label}`);
  if (detail) console.log(`    ${detail}`);
}

async function test(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (err) {
    fail(label, err.message);
  }
}

async function shot(page, name) {
  const path = `test-results/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  screenshots.push(path);
}

console.log(`\n\x1b[1mcc-lens E2E Test Suite\x1b[0m`);
console.log(`Target: ${BASE}\n`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});

try {
  // ── 1. Overview page ─────────────────────────────────────────────────────
  console.log("1. Overview Page");
  const overview = await context.newPage();
  await overview.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });

  await test("page loads with title", async () => {
    await overview.waitForSelector("h1", { timeout: 5000 });
    const title = await overview.textContent("h1");
    if (!title.includes("claude"))
      throw new Error(`Unexpected title: ${title}`);
  });

  await test("hero stats display (conversations, sessions, tokens)", async () => {
    const text = await overview.textContent("body");
    if (!text.includes("conversations"))
      throw new Error("Missing 'conversations'");
    if (!text.includes("sessions")) throw new Error("Missing 'sessions'");
    if (!text.includes("tokens")) throw new Error("Missing 'tokens'");
  });

  await test("tokens show corrected value (not 16.9B)", async () => {
    const text = await overview.textContent("body");
    // Should show M (millions) not B (billions) for token count
    if (text.includes("16.9B"))
      throw new Error("Token count still shows inflated 16.9B");
  });

  await test("Star on GitHub links to pitimon/cc-lens", async () => {
    const href = await overview.getAttribute('a[href*="github.com"]', "href");
    if (!href || !href.includes("pitimon/cc-lens"))
      throw new Error(`GitHub link: ${href}`);
  });

  await shot(overview, "01-overview");
  await overview.close();

  // ── 2. Sessions page ─────────────────────────────────────────────────────
  console.log("\n2. Sessions Page");
  const sessions = await context.newPage();
  await sessions.goto(`${BASE}/sessions`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });

  await test("session table renders", async () => {
    await sessions.waitForSelector("table", { timeout: 5000 });
  });

  await test("sort buttons are keyboard-focusable", async () => {
    const btn = sessions.locator("thead button").first();
    await btn.focus();
    const focused = await btn.evaluate((el) => document.activeElement === el);
    if (!focused) throw new Error("Sort button not focusable");
  });

  await shot(sessions, "02-sessions");
  await sessions.close();

  // ── 3. Costs page ────────────────────────────────────────────────────────
  console.log("\n3. Costs Page");
  const costs = await context.newPage();
  await costs.goto(`${BASE}/costs`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });

  await test("cost page loads", async () => {
    await costs.waitForSelector("body", { timeout: 5000 });
    const text = await costs.textContent("body");
    if (!text.includes("$")) throw new Error("No cost values displayed");
  });

  await shot(costs, "03-costs");
  await costs.close();

  // ── 4. API health endpoint ───────────────────────────────────────────────
  console.log("\n4. API Endpoints");
  const api = await context.newPage();

  await test("/api/health returns ok", async () => {
    const resp = await api.goto(`${BASE}/api/health`);
    const json = await resp.json();
    if (json.status !== "ok") throw new Error(`status: ${json.status}`);
    if (!json.version) throw new Error("Missing version");
  });

  await test("/api/stats returns computed data", async () => {
    const resp = await api.goto(`${BASE}/api/stats`);
    const json = await resp.json();
    if (!json.computed) throw new Error("Missing computed");
    if (json.computed.totalTokens > 1_000_000_000)
      throw new Error(
        `totalTokens still inflated: ${json.computed.totalTokens}`,
      );
  });

  await test("/api/costs returns daily costs", async () => {
    const resp = await api.goto(`${BASE}/api/costs`);
    const json = await resp.json();
    if (!json.daily || json.daily.length === 0)
      throw new Error("No daily costs");
  });

  await test("/api/sessions returns sessions with model field", async () => {
    const resp = await api.goto(`${BASE}/api/sessions`);
    const json = await resp.json();
    if (!json.sessions || json.sessions.length === 0)
      throw new Error("No sessions");
    const withModel = json.sessions.filter((s) => s.model);
    if (withModel.length === 0) throw new Error("No sessions have model field");
  });

  await api.close();

  // ── 5. Export page disclaimer ────────────────────────────────────────────
  console.log("\n5. Export Page");
  const exportPage = await context.newPage();
  await exportPage.goto(`${BASE}/export`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });

  await test("export page shows privacy disclaimer", async () => {
    const text = await exportPage.textContent("body");
    if (!text.includes("prompt text"))
      throw new Error("Missing privacy disclaimer");
  });

  await shot(exportPage, "05-export");
  await exportPage.close();

  // ── 6. Middleware blocks non-localhost ────────────────────────────────────
  console.log("\n6. Security");
  const secPage = await context.newPage();

  await test("middleware allows localhost requests", async () => {
    const resp = await secPage.goto(`${BASE}/api/health`);
    if (resp.status() !== 200) throw new Error(`Status: ${resp.status()}`);
  });

  await secPage.close();

  // ── 7. Navigation ────────────────────────────────────────────────────────
  console.log("\n7. Navigation");
  const nav = await context.newPage();
  await nav.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });

  await test("sidebar has navigation role", async () => {
    const aside = nav.locator('aside[role="navigation"]');
    const count = await aside.count();
    if (count === 0) throw new Error("No aside with role=navigation");
  });

  await nav.close();
} catch (err) {
  fail("Fatal error", err.message);
}

await browser.close();

console.log(`\n${"─".repeat(50)}`);
console.log(`\x1b[1m${passed} passed, ${failed} failed\x1b[0m`);
if (screenshots.length > 0) {
  console.log(`Screenshots: ${screenshots.join(", ")}`);
}
console.log();

process.exit(failed > 0 ? 1 : 0);
