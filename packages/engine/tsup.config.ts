import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/providers.ts", "src/providers-node.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
