/**
 * Main payroll calculation orchestrator
 *
 * Coordinates all calculation rules to produce a complete payroll result
 * for each employee. This module is pure: no database or I/O imports.
 */

import { roundCLP, sum, subtract } from './money.js';
import type {
  CalculationInput,
  CalculationResult,
  EarningType,
  EmployeePayrollInput,
  ReferenceData,
} from './types.js';
import { calculateAFP } from './rules/afp.js';
import { calculateAPV } from './rules/apv.js';
import { calculateFamilyAllowance } from './rules/family-allowance.js';
import { calculateGratification } from './rules/gratification.js';
import { calculateHealth } from './rules/health.js';
import { calculateIncomeTax } from './rules/income-tax.js';
import { calculateMutual } from './rules/mutual.js';
import { calculateSIS } from './rules/sis.js';
import { calculateUnemployment } from './rules/unemployment.js';
import { calculateEmployerPensionReform } from './rules/employer-pension-reform.js';

/**
 * Calculate payroll for a batch of employees.
 *
 * @param input - Full payroll calculation input with employees and reference data
 * @returns Array of calculation results, one per employee
 */
export async function calculatePayroll(input: CalculationInput): Promise<CalculationResult[]> {
  const periodDate = input.periodDate ?? new Date(input.periodYear, input.periodMonth - 1, 1);
  return input.employees.map((employee) =>
    calculateEmployeePayroll(employee, input.referenceData, periodDate)
  );
}

/**
 * Calculate payroll for a single employee.
 *
 * Orchestrates all rule modules to produce earnings, deductions,
 * net pay, and employer costs.
 *
 * @param employee - Employee payroll input
 * @param referenceData - Reference data for calculations
 * @returns Complete calculation result for the employee
 */
export function calculateEmployeePayroll(
  employee: EmployeePayrollInput,
  referenceData: ReferenceData,
  periodDate?: Date,
): CalculationResult {
  const { uf, imm, afpRates, taxBrackets, familyAllowanceBrackets, mutualRate } = referenceData;

  // --- 1. Earnings phase ---

  const baseSalary = roundCLP(employee.baseSalary);

  const gratification = calculateGratification(
    baseSalary,
    employee.gratificationType,
    employee.gratificationAmount ?? 0,
    imm
  );

  // Process earnings array: separate by type and resolve legal flags
  let overtimeTotal = 0;
  let bonusesTotal = 0;
  let allowancesTotal = 0;
  let otherEarningsTotal = 0;
  let imponibleEarnings = 0;
  let taxableEarnings = 0;

  for (const earning of employee.earnings) {
    const amount = roundCLP(earning.amount);
    const { isImponible, isTaxable } = resolveEarningFlags(earning.type, earning.isImponible, earning.isTaxable);

    // Categorize by type
    switch (earning.type) {
      case 'overtime':
        overtimeTotal = sum(overtimeTotal, amount);
        break;
      case 'bonus':
      case 'commission':
        bonusesTotal = sum(bonusesTotal, amount);
        break;
      case 'allowance':
        allowancesTotal = sum(allowancesTotal, amount);
        break;
      default:
        otherEarningsTotal = sum(otherEarningsTotal, amount);
        break;
    }

    if (isImponible) {
      imponibleEarnings = sum(imponibleEarnings, amount);
    }
    if (isTaxable) {
      taxableEarnings = sum(taxableEarnings, amount);
    }
  }

  // Family allowance (tax-exempt, non-imponible)
  const familyAllowance = calculateFamilyAllowance(
    baseSalary,
    employee.familyAllowanceLoads,
    familyAllowanceBrackets
  );

  // colacion and movilizacion are non-taxable, non-imponible
  const colacion = roundCLP(employee.colacion);
  const movilizacion = roundCLP(employee.movilizacion);

  // --- 2. Imponible and taxable base ---

  // Imponible = baseSalary + gratification + imponible earnings from array
  const totalImponible = sum(baseSalary, gratification, imponibleEarnings);

  // Taxable = baseSalary + gratification + taxable earnings from array
  const totalTaxable = sum(baseSalary, gratification, taxableEarnings);

  // Non-taxable = colacion + movilizacion + familyAllowance + non-taxable/non-imponible earnings
  const totalNonTaxable = sum(colacion, movilizacion, familyAllowance);

  // --- 3. Deductions ---

  const afp = calculateAFP(totalImponible, employee.afpCode, afpRates, uf);

  const health = calculateHealth(
    totalImponible,
    employee.healthPlan,
    employee.isapreAmount ?? 0,
    uf
  );

  const contractType = employee.contractType ?? 'indefinido';
  const unemployment = calculateUnemployment(totalImponible, contractType);

  const apv = calculateAPV(employee.apvAmount ?? 0);

  // Income tax base = taxable income minus social security deductions and APV
  const incomeTaxBase = subtract(
    totalTaxable,
    sum(afp, health, apv, unemployment.employee)
  );

  const incomeTax = calculateIncomeTax(incomeTaxBase, taxBrackets, uf);

  // Additional deductions from deductions array
  let additionalDeductions = 0;
  for (const deduction of employee.deductions) {
    additionalDeductions = sum(additionalDeductions, roundCLP(deduction.amount));
  }

  const totalDeductions = sum(afp, health, unemployment.employee, incomeTax, apv, additionalDeductions);

  // --- 4. Net pay ---

  // Total earnings include all items the employee receives
  const totalEarnings = sum(
    baseSalary,
    gratification,
    overtimeTotal,
    bonusesTotal,
    allowancesTotal,
    otherEarningsTotal,
    familyAllowance,
    colacion,
    movilizacion
  );

  const netPay = subtract(totalEarnings, totalDeductions);

  // --- 5. Employer costs ---

  const mutual = calculateMutual(totalImponible, mutualRate);
  const sis = calculateSIS(totalImponible, employee.afpCode, afpRates, uf);
  const employerUnemployment = unemployment.employer;
  const pensionReform = calculateEmployerPensionReform(totalImponible, uf, periodDate ?? new Date());
  const totalEmployerCosts = sum(mutual, sis, employerUnemployment, pensionReform);

  return {
    employeeId: employee.employeeId,
    earnings: {
      baseSalary,
      gratification,
      overtime: overtimeTotal,
      bonuses: bonusesTotal,
      allowances: allowancesTotal,
      familyAllowance,
      other: otherEarningsTotal,
      totalImponible,
      totalTaxable,
      totalNonTaxable,
    },
    deductions: {
      afp,
      health,
      unemployment: unemployment.employee,
      incomeTax,
      apv,
      additionalDeductions,
      total: totalDeductions,
    },
    netPay,
    employerCosts: {
      mutual,
      sis,
      unemployment: employerUnemployment,
      pensionReform,
      total: totalEmployerCosts,
    },
  };
}

/**
 * Resolve imponible/taxable flags for an earning based on its type.
 *
 * Well-known types have legally-mandated flags (Art. 41 Código del Trabajo):
 * - bonus, commission, overtime: always imponible + taxable
 * - viatico, reimbursement, aguinaldo, loss_of_cash: always exempt
 * - allowance, other: use caller-provided flags (default true)
 */
export function resolveEarningFlags(
  type: EarningType,
  isImponible?: boolean,
  isTaxable?: boolean,
): { isImponible: boolean; isTaxable: boolean } {
  switch (type) {
    case 'bonus':
    case 'commission':
    case 'overtime':
      return { isImponible: true, isTaxable: true };

    case 'viatico':
    case 'reimbursement':
    case 'aguinaldo':
    case 'loss_of_cash':
      return { isImponible: false, isTaxable: false };

    case 'allowance':
    case 'other':
    default:
      return { isImponible: isImponible ?? true, isTaxable: isTaxable ?? true };
  }
}
