/**
 * payroll finiquito — termination compensation calculator
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
  calculateFiniquito,
  DEFAULT_REFERENCE_DATA,
  formatCLP,
} from "@emisso/payroll";
import type { TerminationType } from "@emisso/payroll";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
} from "@emisso/cli-core";
import { finiquitoColumns } from "../formatters/payroll-table.js";

const hireDateOpt = Options.text("hire-date").pipe(
  Options.withDescription("Hire date (YYYY-MM-DD)"),
);
const terminationDateOpt = Options.text("termination-date").pipe(
  Options.withDescription("Termination date (YYYY-MM-DD)"),
);
const typeOpt = Options.choice("type", [
  "renuncia",
  "despido_causa",
  "despido_sin_causa",
  "mutuo_acuerdo",
  "fin_plazo",
]).pipe(
  Options.withDescription("Termination type"),
);
const baseSalaryOpt = Options.integer("base-salary").pipe(
  Options.withDescription("Last monthly base salary in CLP"),
);
const gratificationOpt = Options.boolean("gratification-included").pipe(
  Options.withDefault(true),
  Options.withDescription("Whether monthly pay includes legal gratification (default: true)"),
);

const options = {
  hireDate: hireDateOpt,
  terminationDate: terminationDateOpt,
  type: typeOpt,
  baseSalary: baseSalaryOpt,
  gratificationIncluded: gratificationOpt,
  format: formatOption,
  json: jsonFlag,
};

export const finiquitoCommand = Command.make(
  "finiquito",
  options,
  ({ hireDate, terminationDate, type, baseSalary, gratificationIncluded, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const result = calculateFiniquito({
        hireDateStr: hireDate,
        terminationDateStr: terminationDate,
        terminationType: type as TerminationType,
        lastBaseSalary: baseSalary,
        uf: DEFAULT_REFERENCE_DATA.uf,
        imm: DEFAULT_REFERENCE_DATA.imm,
        monthlyGratificationIncluded: gratificationIncluded,
      });

      const rows = [
        { concept: "Vacaciones proporcionales", amount: formatCLP(result.vacacionesProporcionales) },
        { concept: "Gratificación proporcional", amount: formatCLP(result.gratificacionProporcional) },
        { concept: "Aviso previo", amount: formatCLP(result.avisoPrevio) },
        { concept: "Indemnización años servicio", amount: formatCLP(result.indemnizacionAnosServicio) },
        { concept: "─────────────────────────────", amount: "───────────" },
        { concept: "TOTAL", amount: formatCLP(result.total) },
        { concept: "", amount: "" },
        { concept: "Años de servicio", amount: String(result.yearsOfService) },
        { concept: "Meses de servicio", amount: String(result.monthsOfService) },
        { concept: "Tope 90 UF aplicado", amount: result.cappedAtUF ? "Sí" : "No" },
      ];

      yield* renderer.render(rows, {
        columns: finiquitoColumns,
        ttyDefault: "table",
      }, { format: resolvedFormat });
    }),
).pipe(
  Command.withDescription("Calculate finiquito (termination compensation) per Chilean Labor Code"),
);
