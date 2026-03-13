// ── Schema exports ──
export { payrollSchema } from "./db/schema/index.js";
export * from "./db/schema/index.js";

// ── Core ──
export {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  DbError,
  ConflictError,
  isAppError,
  serializeAppError,
  type AppError,
} from "./core/effect/app-error.js";
export {
  toErrorResponse,
  toErrorResponseFromUnknown,
  jsonResponse,
  createdResponse,
  noContentResponse,
  handleEffect,
} from "./core/effect/http-response.js";
export { queryOneOrFail } from "./core/effect/repo-helpers.js";
export { buildReferenceData, employeeToEngineInput } from "./core/bridge.js";

// ── Validation ──
export {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  CreatePayrollRunSchema,
  UpsertIndicatorsSchema,
  GeneratePreviredSchema,
} from "./validation/schemas.js";
export type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreatePayrollRunInput,
  UpsertIndicatorsInput,
  GeneratePreviredInput,
} from "./validation/schemas.js";

// ── Repos ──
export { createTenantRepo, type TenantRepo } from "./repos/tenant-repo.js";
export { createEmployeeRepo, type EmployeeRepo } from "./repos/employee-repo.js";
export { createPayrollRepo, type PayrollRepo } from "./repos/payroll-repo.js";
export { createReferenceRepo, type ReferenceRepo } from "./repos/reference-repo.js";
export { createPreviredRepo, type PreviredRepo } from "./repos/previred-repo.js";

// ── Services ──
export { createTenantService, type TenantService } from "./services/tenant-service.js";
export { createEmployeeService, type EmployeeService } from "./services/employee-service.js";
export { createPayrollService, type PayrollService } from "./services/payroll-service.js";
export { createReferenceService, type ReferenceService } from "./services/reference-service.js";
export { createPreviredService, type PreviredService } from "./services/previred-service.js";

// ── Handlers ──
export { createRouter, type Route, type HandlerFn, type HandlerContext } from "./handlers/router.js";
export { createEmployeeHandlers } from "./handlers/employee-handlers.js";
export { createPayrollHandlers } from "./handlers/payroll-handlers.js";
export { createReferenceHandlers } from "./handlers/reference-handlers.js";
export { createPreviredHandlers } from "./handlers/previred-handlers.js";
