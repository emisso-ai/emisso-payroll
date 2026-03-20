/**
 * Bridge — pure conversion functions between DB rows and engine types.
 * No Effect dependency. Converts Drizzle numeric strings → numbers.
 */

import type {
  ReferenceData,
  EmployeePayrollInput,
} from "@emisso/payroll-cl";
import type {
  ReferenceIndicator,
  ReferenceAfpRate,
  ReferenceTaxBracket,
  ReferenceFamilyAllowance,
  Employee,
  Earning,
  Deduction,
} from "../db/schema/index.js";

// ============================================================================
// REFERENCE DATA CONVERSION
// ============================================================================

/**
 * Converts DB rows (numeric strings) → engine ReferenceData (numbers).
 * - `marginalRate` is stored as decimal (0.04) but engine expects percentage (4)
 * - AFP rates stored as percentages, engine expects percentages
 * - `fonasaRate` and `unemploymentRate` are hardcoded (7% and 0.6%)
 */
export function buildReferenceData(
  indicators: ReferenceIndicator,
  afpRates: ReferenceAfpRate[],
  taxBrackets: ReferenceTaxBracket[],
  familyAllowance: ReferenceFamilyAllowance[],
  mutualRate: number,
): ReferenceData {
  return {
    uf: Number(indicators.uf),
    utm: Number(indicators.utm),
    uta: Number(indicators.uta),
    imm: Number(indicators.imm),
    afpRates: buildAfpRatesRecord(afpRates),
    fonasaRate: 7,
    taxBrackets: taxBrackets
      .sort((a, b) => a.bracketIndex - b.bracketIndex)
      .map((b) => ({
        from: Number(b.lowerBoundUf),
        to: b.upperBoundUf ? Number(b.upperBoundUf) : null,
        rate: Number(b.marginalRate) * 100,
        deduction: Number(b.fixedAmountUf),
      })),
    familyAllowanceBrackets: familyAllowance
      .sort((a, b) => a.bracketIndex - b.bracketIndex)
      .map((f) => ({
        from: Number(f.lowerBoundClp),
        to: f.upperBoundClp ? Number(f.upperBoundClp) : null,
        amount: Number(f.allowancePerDependentClp),
      })),
    unemploymentRate: 0.6,
    mutualRate,
  };
}

function buildAfpRatesRecord(
  rates: ReferenceAfpRate[],
): Record<string, { commissionRate: number; sisRate: number }> {
  const record: Record<string, { commissionRate: number; sisRate: number }> =
    {};
  for (const r of rates) {
    record[r.afpProvider] = {
      commissionRate: Number(r.commissionRate),
      sisRate: Number(r.sisRate),
    };
  }
  return record;
}

// ============================================================================
// EMPLOYEE INPUT CONVERSION
// ============================================================================

/**
 * Maps flat Employee row + earnings/deductions arrays → engine EmployeePayrollInput.
 */
export function employeeToEngineInput(
  employee: Employee,
  employeeEarnings: Earning[],
  employeeDeductions: Deduction[],
): EmployeePayrollInput {
  return {
    employeeId: employee.id,
    rut: employee.rut,
    firstName: employee.firstName,
    lastName: employee.lastName,
    baseSalary: employee.baseSalary,
    gratificationType: employee.gratificationType,
    gratificationAmount: employee.gratificationAmount ?? undefined,
    colacion: employee.colacion ?? 0,
    movilizacion: employee.movilizacion ?? 0,
    afpCode: employee.afpCode,
    afpFund: employee.afpFund,
    healthPlan: employee.healthPlan,
    isapreAmount: employee.isapreAmount ?? undefined,
    apvAmount: employee.apvAmount ?? undefined,
    familyAllowanceLoads: employee.familyAllowanceLoads,
    contractType: employee.contractType ?? undefined,
    earnings: employeeEarnings.map((e) => ({
      type: e.type,
      description: e.description,
      amount: e.amount,
      isTaxable: e.isTaxable,
      isImponible: e.isImponible,
    })),
    deductions: employeeDeductions.map((d) => ({
      type: d.type,
      description: d.description,
      amount: d.amount,
    })),
  };
}
