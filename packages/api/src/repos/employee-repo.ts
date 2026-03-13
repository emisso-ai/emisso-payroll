import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { employees, type Employee, type NewEmployee } from "../db/schema/index.js";
import { DbError, ConflictError } from "../core/effect/app-error.js";
import { queryOneOrFail } from "../core/effect/repo-helpers.js";

export function createEmployeeRepo(db: PgDatabase<any>) {
  return {
    list(
      tenantId: string,
      filters?: { isActive?: boolean },
    ): Effect.Effect<Employee[], DbError> {
      return Effect.tryPromise({
        try: () => {
          const conditions = [eq(employees.tenantId, tenantId)];
          if (filters?.isActive !== undefined) {
            conditions.push(eq(employees.isActive, filters.isActive));
          }
          return db
            .select()
            .from(employees)
            .where(and(...conditions));
        },
        catch: (e) => DbError.make("employee.list", e),
      });
    },

    getById(
      tenantId: string,
      employeeId: string,
    ) {
      return queryOneOrFail("employee.getById", "Employee", employeeId, () =>
        db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.tenantId, tenantId),
            ),
          )
          .then((rows) => rows[0]),
      );
    },

    create(
      tenantId: string,
      data: Omit<NewEmployee, "id" | "tenantId" | "createdAt" | "updatedAt">,
    ): Effect.Effect<Employee, DbError | ConflictError> {
      return Effect.tryPromise({
        try: () =>
          db
            .insert(employees)
            .values({ ...data, tenantId })
            .returning()
            .then((rows) => rows[0]!),
        catch: (e) => {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("unique") || msg.includes("duplicate")) {
            return ConflictError.make(
              `Employee with RUT '${data.rut}' already exists`,
              "Employee",
              data.rut,
            );
          }
          return DbError.make("employee.create", e);
        },
      });
    },

    update(
      tenantId: string,
      employeeId: string,
      data: Partial<Omit<NewEmployee, "id" | "tenantId" | "createdAt">>,
    ) {
      return queryOneOrFail("employee.update", "Employee", employeeId, () =>
        db
          .update(employees)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.tenantId, tenantId),
            ),
          )
          .returning()
          .then((rows) => rows[0]),
      );
    },

    deactivate(
      tenantId: string,
      employeeId: string,
    ) {
      return queryOneOrFail("employee.deactivate", "Employee", employeeId, () =>
        db
          .update(employees)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.tenantId, tenantId),
            ),
          )
          .returning()
          .then((rows) => rows[0]),
      );
    },
  };
}

export type EmployeeRepo = ReturnType<typeof createEmployeeRepo>;
