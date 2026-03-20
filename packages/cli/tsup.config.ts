import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "bin/payroll.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ["@emisso/payroll-cl", "@emisso/cli-core"],
});
