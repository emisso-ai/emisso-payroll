import { Effect } from "effect";
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { employees, type Employee, type NewEmployee } from "../db/schema/index.js";
import { DbError, NotFoundError } from "../core/effect/app-error.js";

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
    ): Effect.Effect<Employee, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
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
        catch: (e) => DbError.make("employee.getById", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("Employee", employeeId)),
        ),
      );
    },

    create(
      tenantId: string,
      data: Omit<NewEmployee, "id" | "tenantId" | "createdAt" | "updatedAt">,
    ): Effect.Effect<Employee, DbError> {
      return Effect.tryPromise({
        try: () =>
          db
            .insert(employees)
            .values({ ...data, tenantId })
            .returning()
            .then((rows) => rows[0]!),
        catch: (e) => DbError.make("employee.create", e),
      });
    },

    update(
      tenantId: string,
      employeeId: string,
      data: Partial<Omit<NewEmployee, "id" | "tenantId" | "createdAt">>,
    ): Effect.Effect<Employee, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
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
        catch: (e) => DbError.make("employee.update", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("Employee", employeeId)),
        ),
      );
    },

    deactivate(
      tenantId: string,
      employeeId: string,
    ): Effect.Effect<Employee, DbError | NotFoundError> {
      return Effect.tryPromise({
        try: () =>
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
        catch: (e) => DbError.make("employee.deactivate", e),
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(row)
            : Effect.fail(NotFoundError.make("Employee", employeeId)),
        ),
      );
    },
  };
}

export type EmployeeRepo = ReturnType<typeof createEmployeeRepo>;
