/**
 * Zod schemas for API request validation at the HTTP boundary.
 */

import { z } from "zod";

// ============================================================================
// EMPLOYEE SCHEMAS
// ============================================================================

export const CreateEmployeeSchema = z.object({
  rut: z.string().min(1, "RUT is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),

  // Contract
  hireDate: z.string().min(1, "Hire date is required"),
  terminationDate: z.string().optional(),
  contractType: z.enum(["indefinido", "plazo_fijo", "por_obra"]).optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  position: z.string().optional(),
  workSchedule: z.string().optional(),

  // Compensation
  baseSalary: z.number().int().positive("Base salary must be positive"),
  gratificationType: z.enum(["legal", "convenida", "none"]).optional(),
  gratificationAmount: z.number().int().nonnegative().optional(),
  colacion: z.number().int().nonnegative().optional(),
  movilizacion: z.number().int().nonnegative().optional(),

  // AFP
  afpCode: z.enum([
    "capital",
    "cuprum",
    "habitat",
    "planvital",
    "provida",
    "modelo",
    "uno",
  ]),
  afpFund: z.enum(["a", "b", "c", "d", "e"]).optional(),

  // Health
  healthPlan: z.enum(["fonasa", "isapre"]).optional(),
  isapreCode: z.string().optional(),
  isapreName: z.string().optional(),
  isapreAmount: z.number().int().nonnegative().optional(),

  // APV
  apvAmount: z.number().int().nonnegative().optional(),

  // Family allowance
  familyAllowanceLoads: z.number().int().nonnegative().optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

// ============================================================================
// PAYROLL RUN SCHEMAS
// ============================================================================

export const CreatePayrollRunSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

export type CreatePayrollRunInput = z.infer<typeof CreatePayrollRunSchema>;

// ============================================================================
// REFERENCE DATA SCHEMAS
// ============================================================================

export const UpsertIndicatorsSchema = z.object({
  effectiveDate: z.string().min(1, "Effective date is required"),
  uf: z.number().positive(),
  utm: z.number().positive(),
  uta: z.number().positive(),
  imm: z.number().positive(),
});

export type UpsertIndicatorsInput = z.infer<typeof UpsertIndicatorsSchema>;

// ============================================================================
// PREVIRED SCHEMAS
// ============================================================================

export const GeneratePreviredSchema = z.object({
  runId: z.string().uuid("Invalid run ID"),
});

export type GeneratePreviredInput = z.infer<typeof GeneratePreviredSchema>;
