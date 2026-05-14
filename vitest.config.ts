import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      include: ["src/lib/**"],
      exclude: ["src/lib/**/__tests__/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
