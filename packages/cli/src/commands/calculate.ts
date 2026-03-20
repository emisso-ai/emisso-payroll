/**
 * payroll calculate -i <file.json> [--format csv|json|table]
 *
 * Batch payroll calculation from a JSON file.
 */

import { Command } from "@effect/cli";
import { Effect } from "effect";
import {
  calculatePayroll,
  formatCLP,
  CalculationInputSchema,
} from "@emisso/payroll-cl";
import type { CalculationInput, CalculationResult } from "@emisso/payroll-cl";
import {
  OutputRenderer,
  CliError,
  resolveFormat,
  formatOption,
  jsonFlag,
  inputFileOption,
  outputFileOption,
} from "@emisso/cli-core";
import { readJsonFile } from "../input/file-reader.js";
import { payrollResultColumns } from "../formatters/payroll-table.js";
import { writeFileSync } from "node:fs";
import { Option } from "effect";

function resultToRow(r: CalculationResult): Record<string, string> {
  return {
    employeeId: r.employeeId,
    baseSalary: formatCLP(r.earnings.baseSalary),
    gratification: formatCLP(r.earnings.gratification),
    totalImponible: formatCLP(r.earnings.totalImponible),
    afp: formatCLP(r.deductions.afp),
    health: formatCLP(r.deductions.health),
    incomeTax: formatCLP(r.deductions.incomeTax),
    totalDeductions: formatCLP(r.deductions.total),
    netPay: formatCLP(r.netPay),
  };
}

const options = {
  input: inputFileOption,
  output: outputFileOption,
  format: formatOption,
  json: jsonFlag,
};

export const calculateCommand = Command.make(
  "calculate",
  options,
  ({ input, output, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      // Read input from file — Zod schema infers optional contractType but engine requires it
      const data = (yield* readJsonFile(input, CalculationInputSchema)) as CalculationInput;
      const results = yield* Effect.tryPromise({
        try: () => calculatePayroll(data),
        catch: (error) =>
          new CliError({
            kind: "general",
            message: "Calculation failed",
            detail: error instanceof Error ? error.message : String(error),
          }),
      });

      const rows = results.map(resultToRow);

      const rendered = yield* renderer.render(rows, {
        columns: payrollResultColumns,
        ttyDefault: "csv",
      }, { format: resolvedFormat });

      // Write to file if -o specified
      const outputPath = Option.getOrUndefined(output);
      if (outputPath) {
        yield* Effect.try({
          try: () => writeFileSync(outputPath, rendered + "\n", "utf-8"),
          catch: (error) =>
            new CliError({
              kind: "general",
              message: `Failed to write file: ${outputPath}`,
              detail: error instanceof Error ? error.message : String(error),
            }),
        });
      }
    }),
).pipe(
  Command.withDescription("Calculate payroll for a batch of employees from a JSON file"),
);
