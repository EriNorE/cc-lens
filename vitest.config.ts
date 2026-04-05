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
      // Thresholds apply to all lib/ modules. Branch coverage is lower
      // because IO-heavy readers (lib/readers/) and conditional render
      // paths have many branches that require integration/E2E tests.
      thresholds: {
        lines: 30,
        functions: 28,
        branches: 27,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
