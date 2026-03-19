/**
 * Next.js App Router adapter for @emisso/payroll-api.
 *
 * Usage in a Next.js catch-all route:
 *   // app/api/payroll/[...path]/route.ts
 *   import { createPayrollRouter } from "@emisso/payroll-api/next";
 *   export const { GET, POST, PUT, DELETE } = createPayrollRouter({ ... });
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { createRouter, type Route } from "../handlers/router.js";
import { createTenantRepo } from "../repos/tenant-repo.js";
import { createEmployeeRepo } from "../repos/employee-repo.js";
import { createPayrollRepo } from "../repos/payroll-repo.js";
import { createReferenceRepo } from "../repos/reference-repo.js";
import { createPreviredRepo } from "../repos/previred-repo.js";
import { createTenantService } from "../services/tenant-service.js";
import { createEmployeeService } from "../services/employee-service.js";
import { createPayrollService } from "../services/payroll-service.js";
import { createReferenceService } from "../services/reference-service.js";
import { createPreviredService } from "../services/previred-service.js";
import { createEmployeeHandlers } from "../handlers/employee-handlers.js";
import { createPayrollHandlers } from "../handlers/payroll-handlers.js";
import { createReferenceHandlers } from "../handlers/reference-handlers.js";
import { createPreviredHandlers } from "../handlers/previred-handlers.js";

export interface PayrollRouterConfig {
  /** PostgreSQL connection string */
  databaseUrl: string;
  /** Base path for the API routes (e.g., "/api/payroll") */
  basePath: string;
  /**
   * Custom tenant ID resolver. Return null to reject the request with 403.
   *
   * **SECURITY WARNING:** The default reads `X-Tenant-Id` from the request
   * header without any authentication — this is ONLY suitable for local
   * development. In production, you MUST provide an authenticated resolver
   * (e.g., extract tenant from a verified JWT or session).
   */
  resolveTenantId?: (req: Request) => string | null | Promise<string | null>;
}

// Cache connection pool per databaseUrl to prevent leaks in Next.js dev HMR
const poolCache = new Map<string, PostgresJsDatabase>();

function getOrCreateDb(databaseUrl: string): PostgresJsDatabase {
  const cached = poolCache.get(databaseUrl);
  if (cached) return cached;
  const sql = postgres(databaseUrl);
  const db: PostgresJsDatabase = drizzle(sql);
  poolCache.set(databaseUrl, db);
  return db;
}

export function createPayrollRouter(config: PayrollRouterConfig) {
  const db = getOrCreateDb(config.databaseUrl);

  // Build repos
  const tenantRepo = createTenantRepo(db as any);
  const employeeRepo = createEmployeeRepo(db as any);
  const payrollRepo = createPayrollRepo(db as any);
  const referenceRepo = createReferenceRepo(db as any);
  const previredRepo = createPreviredRepo(db as any);

  // Build services
  const tenantService = createTenantService(tenantRepo);
  const employeeService = createEmployeeService(employeeRepo);
  const referenceService = createReferenceService(referenceRepo);
  const payrollService = createPayrollService({
    payrollRepo,
    employeeRepo,
    tenantService,
    referenceService,
  });
  const previredService = createPreviredService({
    payrollRepo,
    tenantRepo,
    employeeRepo,
    previredRepo,
  });

  // Build handlers
  const empHandlers = createEmployeeHandlers({ employeeService, employeeRepo });
  const prHandlers = createPayrollHandlers({ payrollService, payrollRepo });
  const refHandlers = createReferenceHandlers({ referenceService, referenceRepo });
  const prevHandlers = createPreviredHandlers({ previredService, previredRepo });

  const base = config.basePath;

  // Define routes
  const routes: Route[] = [
    // Employees
    { method: "GET", pattern: `${base}/employees`, handler: empHandlers.listEmployees },
    { method: "GET", pattern: `${base}/employees/:id`, handler: empHandlers.getEmployee },
    { method: "POST", pattern: `${base}/employees`, handler: empHandlers.createEmployee },
    { method: "PUT", pattern: `${base}/employees/:id`, handler: empHandlers.updateEmployee },
    { method: "DELETE", pattern: `${base}/employees/:id`, handler: empHandlers.deactivateEmployee },

    // Payroll runs
    { method: "GET", pattern: `${base}/runs`, handler: prHandlers.listPayrollRuns },
    { method: "GET", pattern: `${base}/runs/:id`, handler: prHandlers.getPayrollRun },
    { method: "POST", pattern: `${base}/runs`, handler: prHandlers.createPayrollRun },
    { method: "POST", pattern: `${base}/runs/:id/calculate`, handler: prHandlers.calculatePayrollRun },
    { method: "POST", pattern: `${base}/runs/:id/simulate`, handler: prHandlers.simulatePayrollRun },
    { method: "POST", pattern: `${base}/runs/:id/approve`, handler: prHandlers.approvePayrollRun },
    { method: "POST", pattern: `${base}/runs/:id/void`, handler: prHandlers.voidPayrollRun },

    // Reference data
    { method: "GET", pattern: `${base}/reference`, handler: refHandlers.getReferenceData },
    { method: "POST", pattern: `${base}/reference/indicators`, handler: refHandlers.upsertReferenceData },

    // Previred
    { method: "POST", pattern: `${base}/runs/:runId/previred`, handler: prevHandlers.generatePrevired },
    { method: "GET", pattern: `${base}/previred/:id`, handler: prevHandlers.downloadPrevired },
  ];

  const router = createRouter(routes);

  const resolveTenantId =
    config.resolveTenantId ??
    ((req: Request) => req.headers.get("X-Tenant-Id"));

  async function handle(req: Request): Promise<Response> {
    let tenantId: string | null;
    try {
      tenantId = await resolveTenantId(req);
    } catch (e) {
      console.error("[payroll-api] resolveTenantId threw:", e);
      return Response.json(
        { error: { _type: "ForbiddenError", message: "Authentication failed" } },
        { status: 403 },
      );
    }
    if (!tenantId) {
      return Response.json(
        { error: { _type: "ForbiddenError", message: "Missing tenant ID" } },
        { status: 403 },
      );
    }
    return router(req, tenantId);
  }

  return {
    GET: handle,
    POST: handle,
    PUT: handle,
    DELETE: handle,
  };
}
