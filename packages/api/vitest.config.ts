import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      // Engine package.json exports reference .mjs but tsup with "type": "module" produces .js
      "@emisso/payroll-cl": path.resolve(__dirname, "../engine/src/index.ts"),
    },
  },
});
