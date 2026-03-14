/**
 * Net-to-gross reverse salary solver
 *
 * Uses binary search to find the gross salary (baseSalary) that produces
 * a target net pay after all payroll deductions (AFP, health, tax, etc.).
 *
 * This is a pure function module with no I/O or database imports.
 */

import type { EmployeePayrollInput, ReferenceData, CalculationResult } from './types.js';
import { calculateEmployeePayroll } from './calculator.js';
import { roundCLP } from './money.js';

/**
 * Input for the net-to-gross solver.
 * Same shape as EmployeePayrollInput but with targetNetPay instead of baseSalary.
 */
export interface NetToGrossInput {
  employeeId?: string;
  rut: string;
  firstName: string;
  lastName: string;
  targetNetPay: number; // CLP - the desired net pay
  gratificationType: 'legal' | 'convenida' | 'none';
  gratificationAmount?: number;
  colacion: number;
  movilizacion: number;
  afpCode: string;
  afpFund: 'a' | 'b' | 'c' | 'd' | 'e';
  healthPlan: 'fonasa' | 'isapre';
  isapreAmount?: number;
  apvAmount?: number;
  familyAllowanceLoads: number;
  contractType?: 'indefinido' | 'plazo_fijo' | 'por_obra';
  earnings: EmployeePayrollInput['earnings'];
  deductions: EmployeePayrollInput['deductions'];
}

/**
 * Result of the net-to-gross solver
 */
export interface NetToGrossResult {
  targetNetPay: number;
  grossSalary: number;      // The found gross (baseSalary)
  actualNetPay: number;     // The actual net after calculation (may differ by 1 CLP due to rounding)
  breakdown: CalculationResult; // Full calculation at the found gross
  iterations: number;       // Number of binary search iterations
  converged: boolean;       // Whether solver converged within tolerance
}

/**
 * Solve for the gross salary that produces a target net pay.
 *
 * Uses binary search over the gross salary range. The payroll function
 * is monotonically increasing in net pay as gross increases (higher salary
 * always produces higher net), which guarantees binary search convergence.
 *
 * @param input - Employee data with targetNetPay instead of baseSalary
 * @param referenceData - Reference data for payroll calculations
 * @param options - Optional solver configuration
 * @returns The gross salary, actual net pay, full breakdown, and convergence info
 */
export function solveNetToGross(
  input: NetToGrossInput,
  referenceData: ReferenceData,
  options?: {
    tolerance?: number;    // CLP tolerance, default 1
    maxIterations?: number; // default 50
    minGross?: number;     // default: referenceData.imm (minimum wage)
    maxGross?: number;     // default: 300 * referenceData.uf
    periodDate?: Date;     // Optional: date for reform rate calculation
  }
): NetToGrossResult {
  const tolerance = options?.tolerance ?? 1;
  const maxIterations = options?.maxIterations ?? 50;

  let low = options?.minGross ?? referenceData.imm;
  let high = options?.maxGross ?? roundCLP(300 * referenceData.uf);

  const employeeId = input.employeeId ?? crypto.randomUUID();

  let iterations = 0;
  let converged = false;
  let lastResult: CalculationResult | undefined;
  let lastMid = low;

  // Build template once — only baseSalary changes per iteration
  const employeeTemplate: Omit<EmployeePayrollInput, 'baseSalary'> = {
    employeeId,
    rut: input.rut,
    firstName: input.firstName,
    lastName: input.lastName,
    gratificationType: input.gratificationType,
    gratificationAmount: input.gratificationAmount,
    colacion: input.colacion,
    movilizacion: input.movilizacion,
    afpCode: input.afpCode,
    afpFund: input.afpFund,
    healthPlan: input.healthPlan,
    isapreAmount: input.isapreAmount,
    apvAmount: input.apvAmount,
    familyAllowanceLoads: input.familyAllowanceLoads,
    contractType: input.contractType ?? 'indefinido',
    earnings: input.earnings,
    deductions: input.deductions,
  };

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;

    const mid = roundCLP((low + high) / 2);
    lastMid = mid;

    const result = calculateEmployeePayroll(
      { ...employeeTemplate, baseSalary: mid },
      referenceData,
      options?.periodDate,
    );
    lastResult = result;

    if (Math.abs(result.netPay - input.targetNetPay) <= tolerance) {
      converged = true;
      break;
    }

    if (result.netPay < input.targetNetPay) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }

    // Exit early when search space is exhausted
    if (low > high) break;
  }

  // lastResult is always set because maxIterations >= 1
  const finalResult = lastResult!;

  return {
    targetNetPay: input.targetNetPay,
    grossSalary: lastMid,
    actualNetPay: finalResult.netPay,
    breakdown: finalResult,
    iterations,
    converged,
  };
}
