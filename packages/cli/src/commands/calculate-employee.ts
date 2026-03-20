/**
 * payroll calculate-employee — single employee calculation from CLI args
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
  calculateEmployeePayroll,
  DEFAULT_REFERENCE_DATA,
  formatCLP,
} from "@emisso/payroll";
import type { EmployeePayrollInput } from "@emisso/payroll";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";
import { payrollResultColumns } from "../formatters/payroll-table.js";

const baseSalaryOpt = Options.integer("base-salary").pipe(
  Options.withDescription("Monthly base salary in CLP"),
);
const afpOpt = Options.text("afp").pipe(
  Options.withDescription("AFP code (capital, cuprum, habitat, planvital, provida, modelo, uno)"),
);
const healthOpt = Options.choice("health", ["fonasa", "isapre"]).pipe(
  Options.withDescription("Health plan type"),
);
const gratificationOpt = Options.choice("gratification", ["legal", "convenida", "none"]).pipe(
  Options.withDefault("legal" as const),
  Options.withDescription("Gratification type (default: legal)"),
);
const colacionOpt = Options.integer("colacion").pipe(
  Options.withDefault(0),
  Options.withDescription("Lunch allowance in CLP (default: 0)"),
);
const movilizacionOpt = Options.integer("movilizacion").pipe(
  Options.withDefault(0),
  Options.withDescription("Transportation allowance in CLP (default: 0)"),
);
const afpFundOpt = Options.choice("afp-fund", ["a", "b", "c", "d", "e"]).pipe(
  Options.withDefault("c" as const),
  Options.withDescription("AFP fund type A-E (default: c)"),
);
const familyLoadsOpt = Options.integer("family-loads").pipe(
  Options.withDefault(0),
  Options.withDescription("Number of family allowance loads (default: 0)"),
);

const options = {
  baseSalary: baseSalaryOpt,
  afp: afpOpt,
  health: healthOpt,
  gratification: gratificationOpt,
  colacion: colacionOpt,
  movilizacion: movilizacionOpt,
  afpFund: afpFundOpt,
  familyLoads: familyLoadsOpt,
  format: formatOption,
  json: jsonFlag,
};

export const calculateEmployeeCommand = Command.make(
  "calculate-employee",
  options,
  ({ baseSalary, afp, health, gratification, colacion, movilizacion, afpFund, familyLoads, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const employee: EmployeePayrollInput = {
        employeeId: "cli-single",
        rut: "11111111-1",
        firstName: "CLI",
        lastName: "User",
        baseSalary,
        gratificationType: gratification,
        colacion,
        movilizacion,
        afpCode: afp,
        afpFund,
        healthPlan: health,
        familyAllowanceLoads: familyLoads,
        contractType: "indefinido",
        earnings: [],
        deductions: [],
      };

      const result = calculateEmployeePayroll(employee, DEFAULT_REFERENCE_DATA);

      const rows = [
        {
          employeeId: "cli-single",
          baseSalary: formatCLP(result.earnings.baseSalary),
          gratification: formatCLP(result.earnings.gratification),
          totalImponible: formatCLP(result.earnings.totalImponible),
          afp: formatCLP(result.deductions.afp),
          health: formatCLP(result.deductions.health),
          incomeTax: formatCLP(result.deductions.incomeTax),
          totalDeductions: formatCLP(result.deductions.total),
          netPay: formatCLP(result.netPay),
        },
      ];

      yield* renderer.render(rows, {
        columns: payrollResultColumns,
        ttyDefault: "table",
      }, { format: resolvedFormat });
    }),
).pipe(
  Command.withDescription("Calculate payroll for a single employee from CLI arguments"),
);
