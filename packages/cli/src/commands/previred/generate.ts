/**
 * payroll previred generate -i <file.json> [-o <file.txt>]
 */

import { Command } from "@effect/cli";
import { Effect, Option } from "effect";
import {
  generatePreviredFile,
  validatePreviredData,
} from "@emisso/payroll";
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
import { PreviredFileDataSchema } from "./schema.js";
import { writeFileSync } from "node:fs";

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

      const outputPath = Option.getOrUndefined(output);
      if (outputPath) {
        yield* Effect.try({
          try: () => writeFileSync(outputPath, fileContent, "utf-8"),
          catch: (error) =>
            new CliError({
              kind: "general",
              message: `Failed to write file: ${outputPath}`,
              detail: error instanceof Error ? error.message : String(error),
            }),
        });
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
