import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import { seedTenant, seedPayrollRun, TEST_TENANT_ID } from "../helpers/seed";
import { createPreviredRepo } from "../../src/repos/previred-repo";

let pglite: PGlite;
let db: PgliteDatabase;
let repo: ReturnType<typeof createPreviredRepo>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;
  repo = createPreviredRepo(db as any);
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("previred-repo", () => {
  describe("save", () => {
    it("saves a previred file", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite);

      const file = await Effect.runPromise(
        repo.save(TEST_TENANT_ID, runId, "file-content-here"),
      );

      expect(file.id).toBeDefined();
      expect(file.fileContent).toBe("file-content-here");
      expect(file.payrollRunId).toBe(runId);
    });
  });

  describe("getById", () => {
    it("retrieves a previred file by id", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite);

      const saved = await Effect.runPromise(
        repo.save(TEST_TENANT_ID, runId, "file-content"),
      );

      const file = await Effect.runPromise(
        repo.getById(TEST_TENANT_ID, saved.id),
      );

      expect(file.id).toBe(saved.id);
      expect(file.fileContent).toBe("file-content");
    });

    it("fails with NotFoundError for unknown id", async () => {
      await seedTenant(pglite);

      const result = await Effect.runPromiseExit(
        repo.getById(TEST_TENANT_ID, "00000000-0000-0000-0000-999999999999"),
      );
      expect(result._tag).toBe("Failure");
    });
  });
});
