import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: [
        // Readers with tests: projects.ts, memory.ts — now included in coverage
        // Readers without tests yet — exclude until integration tests added:
        "lib/readers/content.ts",
        "lib/readers/facets.ts",
        "lib/readers/index.ts",
        "lib/readers/sessions.ts",
        "lib/readers/stats.ts",
        "lib/readers/storage.ts",
        "lib/claude-reader.ts",
        "lib/logger.ts",
        "lib/cache.ts",
        "lib/replay-parser.ts",
        "lib/tool-categories.ts",
        "lib/utils.ts",
      ],
      // Target: maintain 80% on testable lib modules (pure compute + utilities).
      // Untested readers excluded individually — narrow as tests are added.
      // Branches lower at 60%: conditional paths in decode.ts and pricing.ts
      // fuzzy matching require integration-level tests to cover fully.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 60,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
