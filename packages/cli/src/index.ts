/**
 * Root command composition for @emisso/payroll-cli
 */

import { Command } from "@effect/cli";
import { OutputRenderer } from "@emisso/cli-core";

import { calculateCommand } from "./commands/calculate.js";
import { calculateEmployeeCommand } from "./commands/calculate-employee.js";
import { netToGrossCommand } from "./commands/net-to-gross.js";
import { finiquitoCommand } from "./commands/finiquito.js";
import { overtimeCommand } from "./commands/overtime.js";
import { previredGenerateCommand } from "./commands/previred/generate.js";
import { previredValidateCommand } from "./commands/previred/validate.js";
import { indicatorsCommand } from "./commands/indicators.js";
import { rutValidateCommand } from "./commands/rut/validate.js";
import { rutFormatCommand } from "./commands/rut/format.js";
import { doctorCommand } from "./commands/doctor.js";

// Subcommand groups
const previredCommand = Command.make("previred").pipe(
  Command.withDescription("Previred DDJJ file generation and validation"),
  Command.withSubcommands([previredGenerateCommand, previredValidateCommand]),
);

const rutCommand = Command.make("rut").pipe(
  Command.withDescription("Chilean RUT validation and formatting utilities"),
  Command.withSubcommands([rutValidateCommand, rutFormatCommand]),
);

// Root command
export const rootCommand = Command.make("payroll").pipe(
  Command.withDescription(
    "Chilean payroll calculation CLI — AFP, health, tax, Previred, finiquito, and more",
  ),
  Command.withSubcommands([
    calculateCommand,
    calculateEmployeeCommand,
    netToGrossCommand,
    finiquitoCommand,
    overtimeCommand,
    previredCommand,
    indicatorsCommand,
    rutCommand,
    doctorCommand,
  ]),
);

// Re-export for external usage
export { OutputRenderer };
