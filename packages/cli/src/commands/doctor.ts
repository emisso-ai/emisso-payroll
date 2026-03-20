/**
 * payroll doctor — system health check
 */

import { Command } from "@effect/cli";
import { Effect, Either } from "effect";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";

const options = {
  format: formatOption,
  json: jsonFlag,
};

function tryImport(module: string): Effect.Effect<boolean> {
  return Effect.tryPromise({
    try: () => import(module),
    catch: () => new Error("not found"),
  }).pipe(
    Effect.map(() => true),
    Effect.catchAll(() => Effect.succeed(false)),
  );
}

export const doctorCommand = Command.make(
  "doctor",
  options,
  ({ format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const checks: Array<{ check: string; status: string; detail: string }> = [];

      // Check Node.js version
      const nodeVersion = process.version;
      const nodeMajor = parseInt(nodeVersion.slice(1), 10);
      checks.push({
        check: "Node.js",
        status: nodeMajor >= 18 ? "ok" : "warn",
        detail: `${nodeVersion} (requires >= 18)`,
      });

      // Check @emisso/payroll availability
      const payrollLoaded = yield* tryImport("@emisso/payroll");
      checks.push({
        check: "@emisso/payroll",
        status: payrollLoaded ? "ok" : "error",
        detail: payrollLoaded ? "Loaded successfully" : "Failed to load",
      });

      // Check optional providers
      const providersLoaded = yield* tryImport("@emisso/payroll/providers");
      checks.push({
        check: "Providers (optional)",
        status: providersLoaded ? "ok" : "info",
        detail: providersLoaded
          ? "Available (mindicador, sii, afp-scraper)"
          : "Not available (install effect + cheerio + fast-xml-parser)",
      });

      yield* renderer.render(checks, {
        columns: [
          { key: "check", label: "Check", width: 25 },
          { key: "status", label: "Status", width: 8 },
          { key: "detail", label: "Detail" },
        ],
        ttyDefault: "table",
      }, { format: resolvedFormat });

      const hasError = checks.some((c) => c.status === "error");
      if (hasError) {
        process.exitCode = 1;
      }
    }),
).pipe(Command.withDescription("Check system health and dependency availability"));
