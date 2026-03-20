/**
 * payroll previred validate -i <file.json>
 */

import { Command } from "@effect/cli";
import { Effect } from "effect";
import { validatePreviredData } from "@emisso/payroll-cl";
import {
  OutputRenderer,
  resolveFormat,
  formatOption,
  jsonFlag,
  inputFileOption,
} from "@emisso/cli-core";
import { readJsonFile } from "../../input/file-reader.js";
import { PreviredFileDataSchema } from "./schema.js";

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

        process.exitCode = 1;
      }
    }),
).pipe(
  Command.withDescription("Validate Previred data before file generation"),
);
