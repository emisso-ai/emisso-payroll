/**
 * payroll indicators — fetch current economic indicators
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { DEFAULT_REFERENCE_DATA, formatCLP } from "@emisso/payroll";
import {
  OutputRenderer,
  CliError,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";
import { indicatorColumns } from "../formatters/payroll-table.js";

const sourceOpt = Options.choice("source", ["defaults", "mindicador", "sii"]).pipe(
  Options.withDefault("defaults" as const),
  Options.withDescription("Data source (defaults: built-in values, mindicador/sii: live fetch)"),
);

const options = {
  source: sourceOpt,
  format: formatOption,
  json: jsonFlag,
};

export const indicatorsCommand = Command.make(
  "indicators",
  options,
  ({ source, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      if (source === "mindicador" || source === "sii") {
        const providers = yield* Effect.tryPromise({
          try: () => import("@emisso/payroll/providers"),
          catch: (error) =>
            new CliError({
              kind: "general",
              message: `Failed to load providers module`,
              detail: error instanceof Error ? error.message : String(error),
            }),
        });

        const fetcher =
          source === "mindicador"
            ? providers.fetchCurrentIndicators
            : providers.fetchIndicatorsFromSII;

        const result = yield* Effect.tryPromise({
          try: () => Effect.runPromise(fetcher()),
          catch: (error) =>
            new CliError({
              kind: "general",
              message: `Failed to fetch indicators from ${source}`,
              detail: error instanceof Error ? error.message : String(error),
            }),
        });

        const rows = [
          { name: "UF", value: formatCLP(result.uf) },
          { name: "UTM", value: formatCLP(result.utm) },
          { name: "Fuente", value: source },
          { name: "Fecha", value: new Date().toISOString().split("T")[0] },
        ];

        yield* renderer.render(rows, {
          columns: indicatorColumns,
          ttyDefault: "table",
        }, { format: resolvedFormat });
      } else {
        // Use built-in defaults
        const ref = DEFAULT_REFERENCE_DATA;
        const rows = [
          { name: "UF", value: formatCLP(ref.uf) },
          { name: "UTM", value: formatCLP(ref.utm) },
          { name: "UTA", value: formatCLP(ref.uta) },
          { name: "IMM (Sueldo mínimo)", value: formatCLP(ref.imm) },
          { name: "Tasa FONASA", value: `${ref.fonasaRate}%` },
          { name: "Tasa desempleo", value: `${ref.unemploymentRate}%` },
          { name: "Tasa mutual", value: `${ref.mutualRate}%` },
          { name: "Fuente", value: "defaults (Feb 2026)" },
        ];

        yield* renderer.render(rows, {
          columns: indicatorColumns,
          ttyDefault: "table",
        }, { format: resolvedFormat });
      }
    }),
).pipe(
  Command.withDescription("Show economic indicators (UF, UTM, IMM, rates)"),
);
