import { Effect } from "effect";
import {
  generatePreviredFile,
  parseRut,
} from "@emisso/payroll-cl";
import type {
  PreviredFileData,
  PreviredEmployee,
  CalculationResult,
} from "@emisso/payroll-cl";
import type { PayrollRepo } from "../repos/payroll-repo.js";
import type { TenantRepo } from "../repos/tenant-repo.js";
import type { EmployeeRepo } from "../repos/employee-repo.js";
import type { PreviredRepo } from "../repos/previred-repo.js";
import {
  ValidationError,
  type AppError,
} from "../core/effect/app-error.js";
import type { PreviredFile, Employee } from "../db/schema/index.js";

export function createPreviredService(deps: {
  payrollRepo: PayrollRepo;
  tenantRepo: TenantRepo;
  employeeRepo: EmployeeRepo;
  previredRepo: PreviredRepo;
}) {
  const { payrollRepo, tenantRepo, employeeRepo, previredRepo } = deps;

  return {
    generate(
      tenantId: string,
      runId: string,
    ): Effect.Effect<PreviredFile, AppError> {
      return Effect.gen(function* () {
        // 1. Get run, validate status
        const run = yield* payrollRepo.getRunById(tenantId, runId);
        if (run.status !== "calculated" && run.status !== "approved") {
          return yield* Effect.fail(
            ValidationError.make(
              `Cannot generate Previred for run in '${run.status}' status`,
              "status",
            ),
          );
        }

        // 2. Get tenant (for company RUT/name)
        const tenant = yield* tenantRepo.getById(tenantId);
        if (!tenant.rut) {
          return yield* Effect.fail(
            ValidationError.make("Tenant RUT is required for Previred generation", "rut"),
          );
        }

        // 3. Get results + employees in parallel
        const [results, allEmployees] = yield* Effect.all(
          [
            payrollRepo.getResultsByRunId(tenantId, runId),
            employeeRepo.list(tenantId),
          ],
          { concurrency: 2 },
        );

        // Build employee lookup
        const employeeMap = new Map<string, Employee>();
        for (const emp of allEmployees) {
          employeeMap.set(emp.id, emp);
        }

        // 4. Validate all result employees exist
        const missingIds = results
          .filter((r) => !employeeMap.has(r.employeeId))
          .map((r) => r.employeeId);
        if (missingIds.length > 0) {
          return yield* Effect.fail(
            ValidationError.make(
              `Employee(s) not found for results: ${missingIds.join(", ")}`,
              "employeeId",
            ),
          );
        }

        // 5. Parse company RUT safely
        const companyRut = yield* Effect.try({
          try: () => parseRut(tenant.rut!),
          catch: () => ValidationError.make("Invalid tenant RUT format", "rut"),
        });

        // 6. Build PreviredFileData
        const previredEmployees: PreviredEmployee[] = [];
        for (const r of results) {
          const emp = employeeMap.get(r.employeeId)!;
          previredEmployees.push(
            yield* mapResultToPreviredEmployee(emp, r.resultJson),
          );
        }

        const previredData: PreviredFileData = {
          company: {
            rut: String(companyRut.number),
            rutDv: companyRut.verifier,
            businessName: tenant.businessName ?? tenant.name,
            periodYear: run.periodYear,
            periodMonth: run.periodMonth,
          },
          employees: previredEmployees,
        };

        // 7. Generate file
        const fileContent = generatePreviredFile(previredData);

        // 8. Save to repo (upsert replaces previous file for this run)
        return yield* previredRepo.save(tenantId, runId, fileContent);
      });
    },
  };
}

function mapResultToPreviredEmployee(
  emp: Employee,
  result: CalculationResult,
): Effect.Effect<PreviredEmployee, ValidationError> {
  return Effect.gen(function* () {
    const rutParsed = yield* Effect.try({
      try: () => parseRut(emp.rut),
      catch: () => ValidationError.make(`Invalid RUT format for employee ${emp.id}`, "rut"),
    });

    // Validate ISAPRE employees have a health code
    if (emp.healthPlan === "isapre" && !emp.isapreCode) {
      return yield* Effect.fail(
        ValidationError.make(
          `Employee ${emp.firstName} ${emp.lastName} (${emp.rut}) has healthPlan 'isapre' but no isapreCode`,
          "isapreCode",
        ),
      );
    }

    const nameParts = emp.lastName.split(" ");

    return {
      rut: String(rutParsed.number),
      rutDv: rutParsed.verifier,
      firstName: emp.firstName,
      firstLastName: nameParts[0] ?? emp.lastName,
      secondLastName: nameParts[1] ?? "",
      daysWorked: 30,
      baseSalary: result.earnings.baseSalary,
      gratification: result.earnings.gratification,
      otherImponible: result.earnings.bonuses + result.earnings.allowances + result.earnings.other,
      extraHours: result.earnings.overtime,
      nonTaxableAllowances: result.earnings.totalNonTaxable,
      totalImponibleAfp: result.earnings.totalImponible,
      totalImponibleHealth: result.earnings.totalImponible,
      totalTaxable: result.earnings.totalTaxable,
      afpCode: emp.afpCode,
      afpWorkerAmount: result.deductions.afp,
      sisAmount: 0, // SIS is employer cost
      apvAmount: result.deductions.apv,
      healthCode: emp.healthPlan === "fonasa" ? "07" : emp.isapreCode!,
      healthWorkerAmount: result.deductions.health,
      unemploymentWorker: result.deductions.unemployment,
      unemploymentEmployer: result.employerCosts.unemployment,
      incomeTax: result.deductions.incomeTax,
      netPay: result.netPay,
      mutualAmount: result.employerCosts.mutual,
      pensionReform: result.employerCosts.pensionReform,
    };
  });
}

export type PreviredService = ReturnType<typeof createPreviredService>;
