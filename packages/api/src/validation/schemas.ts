/**
 * Zod schemas for API request validation at the HTTP boundary.
 */

import { z } from "zod";

// ============================================================================
// HELPERS
// ============================================================================

/** ISO 8601 date string (YYYY-MM-DD) */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (s) => !isNaN(new Date(s).getTime()),
    "Invalid date",
  );

// ============================================================================
// EMPLOYEE SCHEMAS
// ============================================================================

export const CreateEmployeeSchema = z
  .object({
    rut: z.string().min(1, "RUT is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    birthDate: isoDateString.optional(),
    nationality: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),

    // Contract
    hireDate: isoDateString,
    terminationDate: isoDateString.optional(),
    contractType: z.enum(["indefinido", "plazo_fijo", "por_obra"]).optional(),
    contractStartDate: isoDateString.optional(),
    contractEndDate: isoDateString.optional(),
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
  })
  .refine(
    (data) => data.healthPlan !== "isapre" || (data.isapreCode && data.isapreCode.length > 0),
    {
      message: "isapreCode is required when healthPlan is 'isapre'",
      path: ["isapreCode"],
    },
  );

export const UpdateEmployeeSchema = CreateEmployeeSchema.innerType().partial();

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

// ============================================================================
// PAYROLL RUN SCHEMAS
// ============================================================================

export const CreatePayrollRunSchema = z
  .object({
    periodYear: z.number().int().min(2020).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    startDate: isoDateString,
    endDate: isoDateString,
    paymentDate: isoDateString,
    notes: z.string().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "startDate must be on or before endDate",
    path: ["startDate"],
  })
  .refine((data) => data.endDate <= data.paymentDate, {
    message: "paymentDate must be on or after endDate",
    path: ["paymentDate"],
  });

export type CreatePayrollRunInput = z.infer<typeof CreatePayrollRunSchema>;

// ============================================================================
// REFERENCE DATA SCHEMAS
// ============================================================================

export const UpsertIndicatorsSchema = z.object({
  effectiveDate: isoDateString,
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
