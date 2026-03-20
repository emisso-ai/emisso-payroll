/**
 * Shared Previred schema — passthrough validation before engine's own validatePreviredData()
 */

import { z } from "zod";
import type { PreviredFileData } from "@emisso/payroll-cl";

export const PreviredFileDataSchema = z.object({
  company: z.object({
    rut: z.string(),
    rutDv: z.string(),
    businessName: z.string(),
    periodYear: z.number(),
    periodMonth: z.number(),
  }),
  employees: z.array(z.any()),
}).passthrough() as unknown as z.ZodType<PreviredFileData>;
