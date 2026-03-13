import { Effect } from "effect";
import { validateRut } from "@emisso/payroll";
import type { EmployeeRepo } from "../repos/employee-repo.js";
import type { Employee, NewEmployee } from "../db/schema/index.js";
import {
  ValidationError,
  type DbError,
  type NotFoundError,
} from "../core/effect/app-error.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../validation/schemas.js";

export function createEmployeeService(employeeRepo: EmployeeRepo) {
  return {
    create(
      tenantId: string,
      input: CreateEmployeeInput,
    ): Effect.Effect<Employee, DbError | ValidationError> {
      return Effect.gen(function* () {
        if (!validateRut(input.rut)) {
          return yield* Effect.fail(
            ValidationError.make("Invalid RUT", "rut"),
          );
        }

        return yield* employeeRepo.create(tenantId, input as Omit<NewEmployee, "id" | "tenantId" | "createdAt" | "updatedAt">);
      });
    },

    update(
      tenantId: string,
      employeeId: string,
      input: UpdateEmployeeInput,
    ): Effect.Effect<Employee, DbError | NotFoundError | ValidationError> {
      return Effect.gen(function* () {
        if (input.rut && !validateRut(input.rut)) {
          return yield* Effect.fail(
            ValidationError.make("Invalid RUT", "rut"),
          );
        }

        return yield* employeeRepo.update(tenantId, employeeId, input as Partial<Omit<NewEmployee, "id" | "tenantId" | "createdAt">>);
      });
    },

    deactivate(
      tenantId: string,
      employeeId: string,
    ): Effect.Effect<Employee, DbError | NotFoundError> {
      return employeeRepo.deactivate(tenantId, employeeId);
    },
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
