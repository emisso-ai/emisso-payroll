/**
 * @emisso/payroll-api — Drizzle schema exports
 * All tables live in the PostgreSQL `payroll` schema.
 */

export { payrollSchema, tenants, deploymentModeEnum } from "./tenants";
export type { Tenant, NewTenant, TenantConfig } from "./tenants";

export {
  employees,
  contractTypeEnum,
  gratificationTypeEnum,
  healthPlanTypeEnum,
  afpFundTypeEnum,
} from "./employees";
export type { Employee, NewEmployee } from "./employees";

export { payrollRuns, payrollRunStatusEnum } from "./payroll-runs";
export type { PayrollRun, NewPayrollRun } from "./payroll-runs";

export { payrollResults } from "./payroll-results";
export type { PayrollResult, NewPayrollResult } from "./payroll-results";

export { earnings, earningTypeEnum } from "./earnings";
export type { Earning, NewEarning } from "./earnings";

export { deductions, deductionTypeEnum } from "./deductions";
export type { Deduction, NewDeduction } from "./deductions";

export {
  referenceIndicators,
  referenceAfpRates,
  afpProviderEnum,
  referenceTaxBrackets,
  referenceFamilyAllowance,
  familyAllowanceTrancheEnum,
} from "./reference-data";
export type {
  ReferenceIndicator,
  NewReferenceIndicator,
  ReferenceAfpRate,
  NewReferenceAfpRate,
  ReferenceTaxBracket,
  NewReferenceTaxBracket,
  ReferenceFamilyAllowance,
  NewReferenceFamilyAllowance,
} from "./reference-data";

export { previredFiles } from "./previred-files";
export type { PreviredFile, NewPreviredFile } from "./previred-files";
