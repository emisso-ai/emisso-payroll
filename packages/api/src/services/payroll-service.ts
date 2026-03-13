import { Effect } from "effect";
import { calculatePayroll } from "@emisso/payroll";
import type { CalculationResult } from "@emisso/payroll";
import type { PayrollRepo } from "../repos/payroll-repo.js";
import type { EmployeeRepo } from "../repos/employee-repo.js";
import type { TenantService } from "./tenant-service.js";
import type { ReferenceService } from "./reference-service.js";
import { employeeToEngineInput } from "../core/bridge.js";
import {
  ValidationError,
  type AppError,
} from "../core/effect/app-error.js";
import type { PayrollRun } from "../db/schema/index.js";

export function createPayrollService(deps: {
  payrollRepo: PayrollRepo;
  employeeRepo: EmployeeRepo;
  tenantService: TenantService;
  referenceService: ReferenceService;
}) {
  const { payrollRepo, employeeRepo, tenantService, referenceService } = deps;

  return {
    calculateRun(
      tenantId: string,
      runId: string,
    ): Effect.Effect<PayrollRun, AppError> {
      return Effect.gen(function* () {
        // 1. Get and validate run
        const run = yield* payrollRepo.getRunById(tenantId, runId);
        if (run.status !== "draft") {
          return yield* Effect.fail(
            ValidationError.make(
              `Cannot calculate run in '${run.status}' status, must be 'draft'`,
              "status",
            ),
          );
        }

        // 2. Fetch independent data in parallel
        const [activeEmployees, config, allEarnings, allDeductions] =
          yield* Effect.all(
            [
              employeeRepo.list(tenantId, { isActive: true }),
              tenantService.getConfig(tenantId),
              payrollRepo.getEarningsByRun(tenantId, runId),
              payrollRepo.getDeductionsByRun(tenantId, runId),
            ],
            { concurrency: 4 },
          );

        if (activeEmployees.length === 0) {
          return yield* Effect.fail(
            ValidationError.make("No active employees found for calculation"),
          );
        }

        // 3. Build reference data (depends on config.mutualRate)
        const refData = yield* referenceService.buildReferenceData(
          undefined,
          config.mutualRate,
        );

        // 4. Map employees → engine inputs using Map lookups (O(n+m) vs O(n*m))
        const earningsByEmployee = groupBy(allEarnings, (e) => e.employeeId);
        const deductionsByEmployee = groupBy(allDeductions, (d) => d.employeeId);

        const employeeInputs = activeEmployees.map((emp) =>
          employeeToEngineInput(
            emp,
            earningsByEmployee.get(emp.id) ?? [],
            deductionsByEmployee.get(emp.id) ?? [],
          ),
        );

        // 5. Call engine
        const results: CalculationResult[] = yield* Effect.tryPromise({
          try: () =>
            calculatePayroll({
              employees: employeeInputs,
              referenceData: refData,
              periodYear: run.periodYear,
              periodMonth: run.periodMonth,
            }),
          catch: (e) =>
            ValidationError.make(
              `Payroll calculation failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
        });

        // 6. Save results
        yield* payrollRepo.upsertResults(
          tenantId,
          runId,
          results.map((r) => ({
            employeeId: r.employeeId,
            resultJson: r,
          })),
        );

        // 7. Update run totals + status (single pass)
        let totalGrossPay = 0;
        let totalDeductions = 0;
        let totalNetPay = 0;
        for (const r of results) {
          totalGrossPay +=
            r.earnings.totalImponible + r.earnings.totalNonTaxable;
          totalDeductions += r.deductions.total;
          totalNetPay += r.netPay;
        }

        return yield* payrollRepo.updateRun(tenantId, runId, {
          status: "calculated",
          totalEmployees: results.length,
          totalGrossPay,
          totalDeductions,
          totalNetPay,
          calculatedAt: new Date(),
        });
      });
    },

    approveRun(
      tenantId: string,
      runId: string,
    ): Effect.Effect<PayrollRun, AppError> {
      return Effect.gen(function* () {
        const run = yield* payrollRepo.getRunById(tenantId, runId);
        if (run.status !== "calculated") {
          return yield* Effect.fail(
            ValidationError.make(
              `Cannot approve run in '${run.status}' status, must be 'calculated'`,
              "status",
            ),
          );
        }
        return yield* payrollRepo.updateRun(tenantId, runId, {
          status: "approved",
          approvedAt: new Date(),
        });
      });
    },

    voidRun(
      tenantId: string,
      runId: string,
    ): Effect.Effect<PayrollRun, AppError> {
      return Effect.gen(function* () {
        const run = yield* payrollRepo.getRunById(tenantId, runId);
        if (run.status === "voided") {
          return yield* Effect.fail(
            ValidationError.make("Run is already voided", "status"),
          );
        }
        return yield* payrollRepo.updateRun(tenantId, runId, {
          status: "voided",
          voidedAt: new Date(),
        });
      });
    },
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export type PayrollService = ReturnType<typeof createPayrollService>;
