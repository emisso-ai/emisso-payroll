import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { EmployeeService } from "../services/employee-service.js";
import type { EmployeeRepo } from "../repos/employee-repo.js";
import { CreateEmployeeSchema, UpdateEmployeeSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  createdResponse,
  handleEffect,
} from "../core/effect/http-response.js";

export function createEmployeeHandlers(deps: {
  employeeService: EmployeeService;
  employeeRepo: EmployeeRepo;
}) {
  const { employeeService, employeeRepo } = deps;

  const listEmployees: HandlerFn = (_req, ctx) => {
    const url = new URL(_req.url);
    const isActive = url.searchParams.get("isActive");
    const filters = isActive !== null ? { isActive: isActive === "true" } : undefined;
    return handleEffect(employeeRepo.list(ctx.tenantId, filters));
  };

  const getEmployee: HandlerFn = (_req, ctx) =>
    handleEffect(employeeRepo.getById(ctx.tenantId, ctx.params.id!));

  const createEmployee: HandlerFn = (req, ctx) =>
    handleEffect(
      Effect.gen(function* () {
        const body = yield* Effect.tryPromise({
          try: () => req.json(),
          catch: () => ValidationError.make("Invalid JSON body"),
        });
        const parsed = CreateEmployeeSchema.safeParse(body);
        if (!parsed.success) {
          return yield* Effect.fail(
            ValidationError.fromZodErrors("Invalid employee data", parsed.error.issues),
          );
        }
        return yield* employeeService.create(ctx.tenantId, parsed.data);
      }),
      createdResponse,
    );

  const updateEmployee: HandlerFn = (req, ctx) =>
    handleEffect(
      Effect.gen(function* () {
        const body = yield* Effect.tryPromise({
          try: () => req.json(),
          catch: () => ValidationError.make("Invalid JSON body"),
        });
        const parsed = UpdateEmployeeSchema.safeParse(body);
        if (!parsed.success) {
          return yield* Effect.fail(
            ValidationError.fromZodErrors("Invalid employee data", parsed.error.issues),
          );
        }
        return yield* employeeService.update(ctx.tenantId, ctx.params.id!, parsed.data);
      }),
    );

  const deactivateEmployee: HandlerFn = (_req, ctx) =>
    handleEffect(employeeService.deactivate(ctx.tenantId, ctx.params.id!));

  return {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
  };
}
