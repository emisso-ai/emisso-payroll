/**
 * JSON file reader — reads from file path or stdin, validates with Zod
 */

import { Effect } from "effect";
import { readFileSync } from "node:fs";
import type { z } from "zod";
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
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as z.ZodError;
        const detail = zodError.errors
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

/**
 * Read JSON from stdin (for piping).
 */
export function readStdin(): Effect.Effect<string, CliError> {
  return Effect.tryPromise({
    try: async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk as ArrayBuffer));
      }
      return Buffer.concat(chunks).toString("utf-8");
    },
    catch: (error) =>
      new CliError({
        kind: "general",
        message: "Failed to read from stdin",
        detail: error instanceof Error ? error.message : String(error),
      }),
  });
}

/**
 * Read and validate JSON from stdin.
 */
export function readJsonStdin<T>(
  schema: z.ZodType<T>,
): Effect.Effect<T, CliError> {
  return Effect.gen(function* () {
    const raw = yield* readStdin();
    return yield* Effect.try({
      try: () => {
        const parsed = JSON.parse(raw) as unknown;
        return schema.parse(parsed);
      },
      catch: (error) => {
        if (error instanceof SyntaxError) {
          return new CliError({
            kind: "bad-args",
            message: "Invalid JSON from stdin",
            detail: error.message,
          });
        }
        if (error instanceof Error && error.name === "ZodError") {
          const zodError = error as z.ZodError;
          const detail = zodError.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ");
          return new CliError({
            kind: "validation",
            message: "Validation error in stdin data",
            detail,
          });
        }
        return new CliError({
          kind: "general",
          message: "Failed to parse stdin data",
          detail: error instanceof Error ? error.message : String(error),
        });
      },
    });
  });
}
