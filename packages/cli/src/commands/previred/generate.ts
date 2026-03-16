/**
 * payroll previred generate -i <file.json> [-o <file.txt>]
 */

import { Command } from "@effect/cli";
import { Effect, Option } from "effect";
import { z } from "zod";
import {
  generatePreviredFile,
  validatePreviredData,
} from "@emisso/payroll";
import type { PreviredFileData } from "@emisso/payroll";
import {
  OutputRenderer,
  CliError,
  resolveFormat,
  formatOption,
  jsonFlag,
  inputFileOption,
  outputFileOption,
} from "@emisso/cli-core";
import { readJsonFile } from "../../input/file-reader.js";
import { writeFileSync } from "node:fs";

// Passthrough schema — we validate via validatePreviredData() after parsing
const PreviredFileDataSchema = z.object({
  company: z.object({
    rut: z.string(),
    rutDv: z.string(),
    businessName: z.string(),
    periodYear: z.number(),
    periodMonth: z.number(),
  }),
  employees: z.array(z.any()),
}).passthrough() as unknown as z.ZodType<PreviredFileData>;

const options = {
  input: inputFileOption,
  output: outputFileOption,
  format: formatOption,
  json: jsonFlag,
};

export const previredGenerateCommand = Command.make(
  "generate",
  options,
  ({ input, output, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const data = yield* readJsonFile(input, PreviredFileDataSchema);

      // Validate first
      const validation = validatePreviredData(data);
      if (!validation.valid) {
        const detail = validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join("; ");
        return yield* Effect.fail(
          new CliError({
            kind: "validation",
            message: "Previred data validation failed",
            detail,
          }),
        );
      }

      const fileContent = generatePreviredFile(data);

      const outputPath = Option.getOrUndefined(output) as string | undefined;
      if (outputPath) {
        writeFileSync(outputPath, fileContent, "utf-8");
        yield* renderer.renderSuccess({
          file: outputPath,
          employees: data.employees.length,
          period: `${data.company.periodYear}-${String(data.company.periodMonth).padStart(2, "0")}`,
        });
      } else {
        // Output the raw file content to stdout
        process.stdout.write(fileContent + "\n");
      }
    }),
).pipe(
  Command.withDescription("Generate a Previred DDJJ fixed-width file from JSON input"),
);
