/**
 * payroll overtime --hours N --base-salary N
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { calculateOvertime, formatCLP } from "@emisso/payroll-cl";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";
import { overtimeColumns } from "../formatters/payroll-table.js";

const hoursOption = Options.integer("hours").pipe(
  Options.withDescription("Number of overtime hours worked"),
);

const baseSalaryOption = Options.integer("base-salary").pipe(
  Options.withDescription("Monthly base salary in CLP"),
);

const options = {
  hours: hoursOption,
  baseSalary: baseSalaryOption,
  format: formatOption,
  json: jsonFlag,
};

export const overtimeCommand = Command.make(
  "overtime",
  options,
  ({ hours, baseSalary, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const result = calculateOvertime(hours, baseSalary);
      const resolvedFormat = resolveFormat(format, json);

      const rows = [
        { field: "Horas extra", value: String(hours) },
        { field: "Sueldo base", value: formatCLP(baseSalary) },
        { field: "Pago horas extra", value: formatCLP(result) },
      ];

      yield* renderer.render(rows, {
        columns: overtimeColumns,
        ttyDefault: "table",
      }, { format: resolvedFormat });
    }),
).pipe(Command.withDescription("Calculate overtime pay for given hours and base salary"));
