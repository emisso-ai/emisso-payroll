import { Effect } from "effect";
import type { HandlerFn } from "./router.js";
import type { PayrollService } from "../services/payroll-service.js";
import type { PayrollRepo } from "../repos/payroll-repo.js";
import { CreatePayrollRunSchema } from "../validation/schemas.js";
import { ValidationError } from "../core/effect/app-error.js";
import {
  jsonResponse,
  createdResponse,
  handleEffect,
} from "../core/effect/http-response.js";

export function createPayrollHandlers(deps: {
  payrollService: PayrollService;
  payrollRepo: PayrollRepo;
}) {
  const { payrollService, payrollRepo } = deps;

  const listPayrollRuns: HandlerFn = (_req, ctx) => {
    const url = new URL(_req.url);
    const year = url.searchParams.get("year");
    const status = url.searchParams.get("status");
    const filters = {
      ...(year ? { year: Number(year) } : {}),
      ...(status ? { status } : {}),
    };
    return handleEffect(payrollRepo.listRuns(ctx.tenantId, filters));
  };

  const getPayrollRun: HandlerFn = (_req, ctx) =>
    handleEffect(payrollRepo.getRunById(ctx.tenantId, ctx.params.id!));

  const createPayrollRun: HandlerFn = (req, ctx) =>
    handleEffect(
      Effect.gen(function* () {
        const body = yield* Effect.tryPromise({
          try: () => req.json(),
          catch: () => ValidationError.make("Invalid JSON body"),
        });
        const parsed = CreatePayrollRunSchema.safeParse(body);
        if (!parsed.success) {
          return yield* Effect.fail(
            ValidationError.fromZodErrors("Invalid payroll run data", parsed.error.issues),
          );
        }
        return yield* payrollRepo.createRun(ctx.tenantId, parsed.data);
      }),
      createdResponse,
    );

  const calculatePayrollRun: HandlerFn = (_req, ctx) =>
    handleEffect(payrollService.calculateRun(ctx.tenantId, ctx.params.id!));

  const approvePayrollRun: HandlerFn = (_req, ctx) =>
    handleEffect(payrollService.approveRun(ctx.tenantId, ctx.params.id!));

  const voidPayrollRun: HandlerFn = (_req, ctx) =>
    handleEffect(payrollService.voidRun(ctx.tenantId, ctx.params.id!));

  return {
    listPayrollRuns,
    getPayrollRun,
    createPayrollRun,
    calculatePayrollRun,
    approvePayrollRun,
    voidPayrollRun,
  };
}
