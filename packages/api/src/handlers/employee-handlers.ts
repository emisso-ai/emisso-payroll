import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { EmployeeService } from "../services/employee-service.js";
import type { EmployeeRepo } from "../repos/employee-repo.js";
import { CreateEmployeeSchema, UpdateEmployeeSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  createdResponse,
  toErrorResponseFromUnknown,
} from "../core/effect/http-response.js";

export function createEmployeeHandlers(deps: {
  employeeService: EmployeeService;
  employeeRepo: EmployeeRepo;
}) {
  const { employeeService, employeeRepo } = deps;

  const listEmployees: HandlerFn = async (_req, ctx) => {
    try {
      const url = new URL(_req.url);
      const isActive = url.searchParams.get("isActive");
      const filters = isActive !== null ? { isActive: isActive === "true" } : undefined;
      const result = await Effect.runPromise(
        employeeRepo.list(ctx.tenantId, filters),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const getEmployee: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        employeeRepo.getById(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const createEmployee: HandlerFn = async (req, ctx) => {
    try {
      const body = await req.json();
      const parsed = CreateEmployeeSchema.safeParse(body);
      if (!parsed.success) {
        throw ValidationError.fromZodErrors(
          "Invalid employee data",
          parsed.error.issues,
        );
      }
      const result = await Effect.runPromise(
        employeeService.create(ctx.tenantId, parsed.data),
      );
      return createdResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const updateEmployee: HandlerFn = async (req, ctx) => {
    try {
      const body = await req.json();
      const parsed = UpdateEmployeeSchema.safeParse(body);
      if (!parsed.success) {
        throw ValidationError.fromZodErrors(
          "Invalid employee data",
          parsed.error.issues,
        );
      }
      const result = await Effect.runPromise(
        employeeService.update(ctx.tenantId, ctx.params.id!, parsed.data),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const deactivateEmployee: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        employeeService.deactivate(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  return {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
  };
}
