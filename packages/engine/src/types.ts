/**
 * Payroll calculation engine types
 *
 * Zod schemas for validation at boundaries + inferred TypeScript types.
 * This module is pure — NO database or I/O imports.
 */

import { z } from 'zod';

// --- Zod Schemas ---

/**
 * Well-known earning types with legal defaults for imponible/taxable flags.
 *
 * - bonus, commission, overtime: always imponible + taxable
 * - viatico, reimbursement, aguinaldo, loss_of_cash: always exempt (Art. 41 CT)
 * - allowance, other: caller-defined via isTaxable/isImponible
 */
export const EarningTypeSchema = z.enum([
  'bonus',
  'commission',
  'overtime',
  'allowance',
  'viatico',
  'reimbursement',
  'aguinaldo',
  'loss_of_cash',
  'other',
]);

export type EarningType = z.infer<typeof EarningTypeSchema>;

export const EarningSchema = z.object({
  type: EarningTypeSchema,
  description: z.string(),
  amount: z.number(),
  isTaxable: z.boolean().optional(),
  isImponible: z.boolean().optional(),
});

export const DeductionSchema = z.object({
  type: z.string(),
  description: z.string(),
  amount: z.number(),
});

export const EmployeePayrollInputSchema = z.object({
  employeeId: z.string(),
  rut: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  baseSalary: z.number().describe('CLP'),
  gratificationType: z.enum(['legal', 'convenida', 'none']),
  gratificationAmount: z.number().optional().describe('For convenida type'),
  colacion: z.number().describe('Lunch allowance (CLP)'),
  movilizacion: z.number().describe('Transportation allowance (CLP)'),
  afpCode: z.string(),
  afpFund: z.enum(['a', 'b', 'c', 'd', 'e']),
  healthPlan: z.enum(['fonasa', 'isapre']),
  isapreAmount: z.number().optional().describe('Additional UF amount'),
  apvAmount: z.number().optional().describe('Voluntary pension savings'),
  familyAllowanceLoads: z.number().int().min(0),
  contractType: z.enum(['indefinido', 'plazo_fijo', 'por_obra']).optional().default('indefinido'),
  earnings: z.array(EarningSchema),
  deductions: z.array(DeductionSchema),
});

export const AFPRateSchema = z.object({
  commissionRate: z.number(),
  sisRate: z.number(),
});

export const TaxBracketSchema = z.object({
  from: z.number().describe('UF'),
  to: z.number().nullable().describe('UF, null for last bracket'),
  rate: z.number().describe('Percentage'),
  deduction: z.number().describe('UF'),
});

export const FamilyAllowanceBracketSchema = z.object({
  from: z.number().describe('CLP'),
  to: z.number().nullable().describe('CLP'),
  amount: z.number().describe('CLP per load'),
});

export const ReferenceDataSchema = z.object({
  uf: z.number().describe('UF value in CLP'),
  utm: z.number().describe('UTM value in CLP'),
  uta: z.number().describe('UTA value in CLP'),
  imm: z.number().describe('Ingreso Mínimo Mensual (minimum wage)'),
  afpRates: z.record(z.string(), AFPRateSchema),
  fonasaRate: z.number().describe('Percentage (typically 7%)'),
  taxBrackets: z.array(TaxBracketSchema),
  familyAllowanceBrackets: z.array(FamilyAllowanceBracketSchema),
  unemploymentRate: z.number().describe('Percentage'),
  mutualRate: z.number().describe('Percentage (variable by company)'),
});

export const CalculationInputSchema = z.object({
  employees: z.array(EmployeePayrollInputSchema),
  referenceData: ReferenceDataSchema,
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  periodDate: z.date().optional().describe('Date for which calculation is performed (affects reform rate)'),
});

// --- Inferred Types ---

export type EmployeePayrollInput = z.infer<typeof EmployeePayrollInputSchema>;
export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
export type CalculationInput = z.infer<typeof CalculationInputSchema>;

/**
 * Breakdown of earnings
 */
export interface EarningsBreakdown {
  baseSalary: number;
  gratification: number;
  overtime: number;
  bonuses: number;
  allowances: number;
  familyAllowance: number;
  other: number;
  totalImponible: number; // Subject to social security
  totalTaxable: number; // Subject to income tax
  totalNonTaxable: number; // Tax-exempt
}

/**
 * Breakdown of deductions
 */
export interface DeductionsBreakdown {
  afp: number;
  health: number;
  unemployment: number; // Employee portion
  incomeTax: number;
  apv: number;
  additionalDeductions: number;
  total: number;
}

/**
 * Complete calculation result for one employee
 */
export interface CalculationResult {
  employeeId: string;
  earnings: EarningsBreakdown;
  deductions: DeductionsBreakdown;
  netPay: number; // Liquid a pagar
  employerCosts: {
    mutual: number;
    sis: number;
    unemployment: number; // Employer portion
    pensionReform: number; // 2025 reform employer contribution (Law 21.720)
    total: number;
  };
}
