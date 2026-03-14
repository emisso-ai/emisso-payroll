import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import {
  seedTenant,
  seedEmployee,
  seedPayrollRun,
  TEST_TENANT_ID,
  TEST_EMPLOYEE_ID,
} from "../helpers/seed";
import { createPayrollRepo } from "../../src/repos/payroll-repo";

let pglite: PGlite;
let db: PgliteDatabase;
let repo: ReturnType<typeof createPayrollRepo>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;
  repo = createPayrollRepo(db as any);
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("payroll-repo", () => {
  describe("createRun", () => {
    it("creates a payroll run", async () => {
      await seedTenant(pglite);

      const run = await Effect.runPromise(
        repo.createRun(TEST_TENANT_ID, {
          periodYear: 2026,
          periodMonth: 3,
          startDate: "2026-03-01",
          endDate: "2026-03-28",
          paymentDate: "2026-03-28",
        }),
      );

      expect(run.id).toBeDefined();
      expect(run.periodYear).toBe(2026);
      expect(run.periodMonth).toBe(3);
      expect(run.status).toBe("draft");
    });

    it("rejects duplicate period for same tenant (ConflictError)", async () => {
      await seedTenant(pglite);
      await seedPayrollRun(pglite, { year: 2026, month: 3 });

      const result = await Effect.runPromiseExit(
        repo.createRun(TEST_TENANT_ID, {
          periodYear: 2026,
          periodMonth: 3,
          startDate: "2026-03-01",
          endDate: "2026-03-28",
          paymentDate: "2026-03-28",
        }),
      );

      expect(result._tag).toBe("Failure");
    });
  });

  describe("getRunById", () => {
    it("returns a run by id", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite);

      const run = await Effect.runPromise(
        repo.getRunById(TEST_TENANT_ID, runId),
      );
      expect(run.id).toBe(runId);
    });

    it("fails with NotFoundError for unknown id", async () => {
      await seedTenant(pglite);

      const result = await Effect.runPromiseExit(
        repo.getRunById(TEST_TENANT_ID, "00000000-0000-0000-0000-999999999999"),
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("listRuns", () => {
    it("lists runs for tenant", async () => {
      await seedTenant(pglite);
      await seedPayrollRun(pglite, { id: "00000000-0000-0000-0000-000000000020", year: 2026, month: 1 });
      await seedPayrollRun(pglite, { id: "00000000-0000-0000-0000-000000000021", year: 2026, month: 2 });

      const runs = await Effect.runPromise(repo.listRuns(TEST_TENANT_ID));
      expect(runs).toHaveLength(2);
    });

    it("filters by year", async () => {
      await seedTenant(pglite);
      await seedPayrollRun(pglite, { id: "00000000-0000-0000-0000-000000000020", year: 2025, month: 12 });
      await seedPayrollRun(pglite, { id: "00000000-0000-0000-0000-000000000021", year: 2026, month: 1 });

      const runs = await Effect.runPromise(
        repo.listRuns(TEST_TENANT_ID, { year: 2026 }),
      );
      expect(runs).toHaveLength(1);
      expect(runs[0]!.periodYear).toBe(2026);
    });
  });

  describe("upsertResults", () => {
    it("inserts results for a run", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);
      const runId = await seedPayrollRun(pglite);

      await Effect.runPromise(
        repo.upsertResults(TEST_TENANT_ID, runId, [
          {
            employeeId: TEST_EMPLOYEE_ID,
            resultJson: {
              employeeId: TEST_EMPLOYEE_ID,
              earnings: {
                baseSalary: 1000000,
                gratification: 0,
                overtime: 0,
                bonuses: 0,
                allowances: 0,
                familyAllowance: 0,
                other: 0,
                totalImponible: 1000000,
                totalTaxable: 1000000,
                totalNonTaxable: 0,
              },
              deductions: {
                afp: 144000,
                health: 70000,
                unemployment: 6000,
                incomeTax: 0,
                apv: 0,
                additionalDeductions: 0,
                total: 220000,
              },
              netPay: 780000,
              employerCosts: {
                mutual: 9300,
                sis: 18700,
                unemployment: 24000,
                pensionReform: 0,
                total: 52000,
              },
            } as any,
          },
        ]),
      );

      const results = await Effect.runPromise(
        repo.getResultsByRunId(TEST_TENANT_ID, runId),
      );
      expect(results).toHaveLength(1);
      expect(results[0]!.employeeId).toBe(TEST_EMPLOYEE_ID);
    });

    it("replaces existing results on re-upsert", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);
      const runId = await seedPayrollRun(pglite);

      const mockResult = {
        employeeId: TEST_EMPLOYEE_ID,
        resultJson: { employeeId: TEST_EMPLOYEE_ID, netPay: 780000 } as any,
      };

      await Effect.runPromise(
        repo.upsertResults(TEST_TENANT_ID, runId, [mockResult]),
      );
      await Effect.runPromise(
        repo.upsertResults(TEST_TENANT_ID, runId, [
          { ...mockResult, resultJson: { ...mockResult.resultJson, netPay: 800000 } },
        ]),
      );

      const results = await Effect.runPromise(
        repo.getResultsByRunId(TEST_TENANT_ID, runId),
      );
      expect(results).toHaveLength(1);
    });
  });
});
