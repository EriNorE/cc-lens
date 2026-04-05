import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "lib/costs-compute.ts",
        "lib/stats-compute.ts",
        "lib/pricing.ts",
        "lib/decode.ts",
      ],
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
