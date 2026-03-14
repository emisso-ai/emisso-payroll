import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { Effect } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { setupTestDb, truncateAll } from "../helpers/setup-db";
import { seedTenant, seedEmployee, TEST_TENANT_ID, TEST_EMPLOYEE_ID } from "../helpers/seed";
import { createEmployeeRepo } from "../../src/repos/employee-repo";

let pglite: PGlite;
let db: PgliteDatabase;
let repo: ReturnType<typeof createEmployeeRepo>;

beforeAll(async () => {
  const result = await setupTestDb();
  pglite = result.pglite;
  db = result.db;
  repo = createEmployeeRepo(db as any);
});

afterEach(async () => {
  await truncateAll(pglite);
});

afterAll(async () => {
  await pglite.close();
});

describe("employee-repo", () => {
  describe("create", () => {
    it("creates an employee", async () => {
      await seedTenant(pglite);

      const emp = await Effect.runPromise(
        repo.create(TEST_TENANT_ID, {
          rut: "12345678-5",
          firstName: "Juan",
          lastName: "Pérez",
          hireDate: "2024-01-01",
          baseSalary: 1000000,
          afpCode: "capital",
          afpFund: "c",
          healthPlan: "fonasa",
          familyAllowanceLoads: 0,
        }),
      );

      expect(emp.id).toBeDefined();
      expect(emp.rut).toBe("12345678-5");
      expect(emp.firstName).toBe("Juan");
      expect(emp.tenantId).toBe(TEST_TENANT_ID);
    });
  });

  describe("list", () => {
    it("lists all employees for a tenant", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite, { id: TEST_EMPLOYEE_ID, rut: "12345678-5" });
      await seedEmployee(pglite, { id: "00000000-0000-0000-0000-000000000012", rut: "11111111-1" });

      const result = await Effect.runPromise(repo.list(TEST_TENANT_ID));
      expect(result).toHaveLength(2);
    });

    it("filters by isActive", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite, { id: TEST_EMPLOYEE_ID, rut: "12345678-5", isActive: true });
      await seedEmployee(pglite, { id: "00000000-0000-0000-0000-000000000012", rut: "11111111-1", isActive: false });

      const active = await Effect.runPromise(repo.list(TEST_TENANT_ID, { isActive: true }));
      expect(active).toHaveLength(1);
      expect(active[0]!.rut).toBe("12345678-5");

      const inactive = await Effect.runPromise(repo.list(TEST_TENANT_ID, { isActive: false }));
      expect(inactive).toHaveLength(1);
      expect(inactive[0]!.rut).toBe("11111111-1");
    });
  });

  describe("getById", () => {
    it("returns employee by id", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);

      const emp = await Effect.runPromise(
        repo.getById(TEST_TENANT_ID, TEST_EMPLOYEE_ID),
      );
      expect(emp.id).toBe(TEST_EMPLOYEE_ID);
    });

    it("fails with NotFoundError for unknown id", async () => {
      await seedTenant(pglite);

      const result = await Effect.runPromiseExit(
        repo.getById(TEST_TENANT_ID, "00000000-0000-0000-0000-999999999999"),
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("update", () => {
    it("updates employee fields", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);

      const updated = await Effect.runPromise(
        repo.update(TEST_TENANT_ID, TEST_EMPLOYEE_ID, {
          baseSalary: 1500000,
          position: "Senior Developer",
        }),
      );

      expect(updated.baseSalary).toBe(1500000);
      expect(updated.position).toBe("Senior Developer");
    });

    it("fails with NotFoundError for unknown id", async () => {
      await seedTenant(pglite);

      const result = await Effect.runPromiseExit(
        repo.update(TEST_TENANT_ID, "00000000-0000-0000-0000-999999999999", {
          baseSalary: 2000000,
        }),
      );
      expect(result._tag).toBe("Failure");
    });
  });

  describe("deactivate", () => {
    it("sets isActive to false", async () => {
      await seedTenant(pglite);
      await seedEmployee(pglite);

      const deactivated = await Effect.runPromise(
        repo.deactivate(TEST_TENANT_ID, TEST_EMPLOYEE_ID),
      );
      expect(deactivated.isActive).toBe(false);
    });
  });
});
