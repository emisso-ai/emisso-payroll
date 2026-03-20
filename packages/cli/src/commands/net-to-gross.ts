/**
 * payroll net-to-gross — reverse salary solver
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
  solveNetToGross,
  DEFAULT_REFERENCE_DATA,
  formatCLP,
} from "@emisso/payroll";
import type { NetToGrossInput } from "@emisso/payroll";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";
import { netToGrossColumns } from "../formatters/payroll-table.js";

const targetNetOpt = Options.integer("target-net").pipe(
  Options.withDescription("Target net pay in CLP"),
);
const afpOpt = Options.text("afp").pipe(
  Options.withDescription("AFP code (capital, cuprum, habitat, planvital, provida, modelo, uno)"),
);
const healthOpt = Options.choice("health", ["fonasa", "isapre"]).pipe(
  Options.withDescription("Health plan type"),
);
const afpFundOpt = Options.choice("afp-fund", ["a", "b", "c", "d", "e"]).pipe(
  Options.withDefault("c" as const),
  Options.withDescription("AFP fund type A-E (default: c)"),
);
const toleranceOpt = Options.integer("tolerance").pipe(
  Options.withDefault(1),
  Options.withDescription("CLP tolerance for convergence (default: 1)"),
);

const options = {
  targetNet: targetNetOpt,
  afp: afpOpt,
  health: healthOpt,
  afpFund: afpFundOpt,
  tolerance: toleranceOpt,
  format: formatOption,
  json: jsonFlag,
};

export const netToGrossCommand = Command.make(
  "net-to-gross",
  options,
  ({ targetNet, afp, health, afpFund, tolerance, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const input: NetToGrossInput = {
        rut: "11111111-1",
        firstName: "CLI",
        lastName: "User",
        targetNetPay: targetNet,
        gratificationType: "legal",
        colacion: 0,
        movilizacion: 0,
        afpCode: afp,
        afpFund,
        healthPlan: health,
        familyAllowanceLoads: 0,
        earnings: [],
        deductions: [],
      };

      const result = solveNetToGross(input, DEFAULT_REFERENCE_DATA, {
        tolerance,
      });

      const rows = [
        { field: "Sueldo líquido objetivo", value: formatCLP(targetNet) },
        { field: "Sueldo bruto calculado", value: formatCLP(result.grossSalary) },
        { field: "Líquido real", value: formatCLP(result.actualNetPay) },
        { field: "Convergió", value: result.converged ? "Sí" : "No" },
        { field: "Iteraciones", value: String(result.iterations) },
        { field: "AFP", value: formatCLP(result.breakdown.deductions.afp) },
        { field: "Salud", value: formatCLP(result.breakdown.deductions.health) },
        { field: "Impuesto", value: formatCLP(result.breakdown.deductions.incomeTax) },
      ];

      yield* renderer.render(rows, {
        columns: netToGrossColumns,
        ttyDefault: "table",
      }, { format: resolvedFormat });
    }),
).pipe(
  Command.withDescription("Find the gross salary that produces a target net pay"),
);
