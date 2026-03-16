import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import { z } from "zod";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readJsonFile } from "../src/input/file-reader";
import { CliError } from "@emisso/cli-core";

const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "cli-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("readJsonFile", () => {
  it("reads and validates a valid JSON file", async () => {
    const file = join(tempDir, "valid.json");
    writeFileSync(file, JSON.stringify({ name: "test", value: 42 }));

    const result = await Effect.runPromise(readJsonFile(file, TestSchema));
    expect(result).toEqual({ name: "test", value: 42 });
  });

  it("fails on invalid JSON syntax", async () => {
    const file = join(tempDir, "invalid.json");
    writeFileSync(file, "{ not valid json }");

    const result = await Effect.runPromise(
      readJsonFile(file, TestSchema).pipe(
        Effect.either,
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CliError);
      expect((result.left as CliError).kind).toBe("bad-args");
    }
  });

  it("fails on schema validation error", async () => {
    const file = join(tempDir, "wrong-schema.json");
    writeFileSync(file, JSON.stringify({ name: 123, value: "not a number" }));

    const result = await Effect.runPromise(
      readJsonFile(file, TestSchema).pipe(
        Effect.either,
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CliError);
      expect((result.left as CliError).kind).toBe("validation");
    }
  });

  it("fails on non-existent file", async () => {
    const file = join(tempDir, "nonexistent.json");

    const result = await Effect.runPromise(
      readJsonFile(file, TestSchema).pipe(
        Effect.either,
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CliError);
      expect((result.left as CliError).kind).toBe("general");
    }
  });
});
