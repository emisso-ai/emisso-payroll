/**
 * JSON file reader — reads from file path, validates with Zod
 */

import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { CliError } from "@emisso/cli-core";

/**
 * Read JSON from a file path and validate against a Zod schema.
 */
export function readJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
): Effect.Effect<T, CliError> {
  return Effect.try({
    try: () => {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      return schema.parse(parsed);
    },
    catch: (error) => {
      if (error instanceof SyntaxError) {
        return new CliError({
          kind: "bad-args",
          message: `Invalid JSON in file: ${filePath}`,
          detail: error.message,
        });
      }
      if (error instanceof z.ZodError) {
        const detail = error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        return new CliError({
          kind: "validation",
          message: `Validation error in ${filePath}`,
          detail,
        });
      }
      return new CliError({
        kind: "general",
        message: `Failed to read file: ${filePath}`,
        detail: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
