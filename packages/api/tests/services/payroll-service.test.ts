import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import {
  seedTenant,
  seedEmployee,
  seedPayrollRun,
  seedReferenceData,
  TEST_TENANT_ID,
  TEST_EMPLOYEE_ID,
} from "../helpers/seed";
import { createTenantRepo } from "../../src/repos/tenant-repo";
import { createEmployeeRepo } from "../../src/repos/employee-repo";
import { createPayrollRepo } from "../../src/repos/payroll-repo";
import { createReferenceRepo } from "../../src/repos/reference-repo";
import { createTenantService } from "../../src/services/tenant-service";
import { createReferenceService } from "../../src/services/reference-service";
import { createPayrollService } from "../../src/services/payroll-service";

let pglite: PGlite;
let db: PgliteDatabase;
let payrollService: ReturnType<typeof createPayrollService>;
let payrollRepo: ReturnType<typeof createPayrollRepo>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;

  const tenantRepo = createTenantRepo(db as any);
  const employeeRepo = createEmployeeRepo(db as any);
  payrollRepo = createPayrollRepo(db as any);
  const referenceRepo = createReferenceRepo(db as any);

  const tenantService = createTenantService(tenantRepo);
  const referenceService = createReferenceService(referenceRepo);

  payrollService = createPayrollService({
    payrollRepo,
    employeeRepo,
    tenantService,
    referenceService,
  });
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("payroll-service", () => {
  describe("calculateRun", () => {
    it("calculates payroll for active employees", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);
      await seedReferenceData(pglite);
      const runId = await seedPayrollRun(pglite, { status: "draft" });

      const updated = await Effect.runPromise(
        payrollService.calculateRun(TEST_TENANT_ID, runId),
      );

      expect(updated.status).toBe("calculated");
      expect(updated.totalEmployees).toBe(1);
      expect(updated.totalNetPay).toBeGreaterThan(0);
      expect(updated.calculatedAt).toBeDefined();

      // Verify results were saved
      const results = await Effect.runPromise(
        payrollRepo.getResultsByRunId(TEST_TENANT_ID, runId),
      );
      expect(results).toHaveLength(1);
      expect(results[0]!.resultJson.employeeId).toBe(TEST_EMPLOYEE_ID);
    });

    it("rejects run that is not in draft status", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);
      await seedReferenceData(pglite);
      const runId = await seedPayrollRun(pglite, { status: "calculated" });

      const result = await Effect.runPromiseExit(
        payrollService.calculateRun(TEST_TENANT_ID, runId),
      );
      expect(result._tag).toBe("Failure");
    });

    it("rejects when no active employees", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite, { isActive: false });
      await seedReferenceData(pglite);
      const runId = await seedPayrollRun(pglite, { status: "draft" });

      const result = await Effect.runPromiseExit(
        payrollService.calculateRun(TEST_TENANT_ID, runId),
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("approveRun", () => {
    it("approves a calculated run", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite, { status: "calculated" });

      const approved = await Effect.runPromise(
        payrollService.approveRun(TEST_TENANT_ID, runId),
      );

      expect(approved.status).toBe("approved");
      expect(approved.approvedAt).toBeDefined();
    });

    it("rejects run that is not in calculated status", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite, { status: "draft" });

      const result = await Effect.runPromiseExit(
        payrollService.approveRun(TEST_TENANT_ID, runId),
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("voidRun", () => {
    it("voids a non-voided run", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite, { status: "calculated" });

      const voided = await Effect.runPromise(
        payrollService.voidRun(TEST_TENANT_ID, runId),
      );

      expect(voided.status).toBe("voided");
      expect(voided.voidedAt).toBeDefined();
    });

    it("rejects voiding an already voided run", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite, { status: "voided" });

      const result = await Effect.runPromiseExit(
        payrollService.voidRun(TEST_TENANT_ID, runId),
      );
      expect(result._tag).toBe("Failure");
    });

    it("can void a draft run", async () => {
      await seedTenant(pglite);
      const runId = await seedPayrollRun(pglite, { status: "draft" });

      const voided = await Effect.runPromise(
        payrollService.voidRun(TEST_TENANT_ID, runId),
      );

      expect(voided.status).toBe("voided");
    });
  });
});
