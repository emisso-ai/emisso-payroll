/**
 * payroll previred validate -i <file.json>
 */

import { Command } from "@effect/cli";
import { Effect } from "effect";
import { z } from "zod";
import { validatePreviredData } from "@emisso/payroll";
import type { PreviredFileData } from "@emisso/payroll";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
  inputFileOption,
} from "@emisso/cli-core";
import { readJsonFile } from "../../input/file-reader.js";

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
  format: formatOption,
  json: jsonFlag,
};

export const previredValidateCommand = Command.make(
  "validate",
  options,
  ({ input, format, json }) =>
    Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      const resolvedFormat = resolveFormat(format, json);

      const data = yield* readJsonFile(input, PreviredFileDataSchema);
      const result = validatePreviredData(data);

      if (result.valid) {
        yield* renderer.renderSuccess({
          valid: true,
          employees: data.employees.length,
          message: "Previred data is valid",
        });
      } else {
        const rows = result.errors.map((e) => ({
          field: e.field,
          message: e.message,
          value: String(e.value ?? ""),
        }));

        yield* renderer.render(rows, {
          columns: [
            { key: "field", label: "Campo", width: 25 },
            { key: "message", label: "Error" },
            { key: "value", label: "Valor" },
          ],
          ttyDefault: "table",
        }, { format: resolvedFormat });

        process.exitCode = 5;
      }
    }),
).pipe(
  Command.withDescription("Validate Previred data before file generation"),
);
