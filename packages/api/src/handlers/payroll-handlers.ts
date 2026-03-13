import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { PayrollService } from "../services/payroll-service.js";
import type { PayrollRepo } from "../repos/payroll-repo.js";
import { CreatePayrollRunSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  createdResponse,
  toErrorResponseFromUnknown,
} from "../core/effect/http-response.js";

export function createPayrollHandlers(deps: {
  payrollService: PayrollService;
  payrollRepo: PayrollRepo;
}) {
  const { payrollService, payrollRepo } = deps;

  const listPayrollRuns: HandlerFn = async (_req, ctx) => {
    try {
      const url = new URL(_req.url);
      const year = url.searchParams.get("year");
      const status = url.searchParams.get("status");
      const filters = {
        ...(year ? { year: Number(year) } : {}),
        ...(status ? { status } : {}),
      };
      const result = await Effect.runPromise(
        payrollRepo.listRuns(ctx.tenantId, filters),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const getPayrollRun: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        payrollRepo.getRunById(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const createPayrollRun: HandlerFn = async (req, ctx) => {
    try {
      const body = await req.json();
      const parsed = CreatePayrollRunSchema.safeParse(body);
      if (!parsed.success) {
        throw ValidationError.fromZodErrors(
          "Invalid payroll run data",
          parsed.error.issues,
        );
      }
      const result = await Effect.runPromise(
        payrollRepo.createRun(ctx.tenantId, parsed.data),
      );
      return createdResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const calculatePayrollRun: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        payrollService.calculateRun(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const approvePayrollRun: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        payrollService.approveRun(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  const voidPayrollRun: HandlerFn = async (_req, ctx) => {
    try {
      const result = await Effect.runPromise(
        payrollService.voidRun(ctx.tenantId, ctx.params.id!),
      );
      return jsonResponse(result);
    } catch (e) {
      return toErrorResponseFromUnknown(e);
    }
  };

  return {
    listPayrollRuns,
    getPayrollRun,
    createPayrollRun,
    calculatePayrollRun,
    approvePayrollRun,
    voidPayrollRun,
  };
}
