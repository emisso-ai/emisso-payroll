import { index, jsonb, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { CalculationResult } from "@emisso/payroll-cl";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";
import { employees } from "./employees";

/**
 * Payroll results — individual calculation results per employee per run.
 * Stores the full CalculationResult from the engine as JSONB.
 *
 * Note: result_json can be large. Listing queries should select specific
 * columns and only fetch result_json when viewing a single result's detail.
 */
export const payrollResults = payrollSchema.table(
  "payroll_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    /** Full engine CalculationResult stored as JSONB */
    resultJson: jsonb("result_json").$type<CalculationResult>().notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tenantRunIdx: index("pr_payroll_results_tenant_run_idx").on(
      table.tenantId,
      table.payrollRunId,
    ),
    uniqueRunEmployee: unique("pr_payroll_results_run_employee_unq").on(
      table.payrollRunId,
      table.employeeId,
    ),
  }),
);

export type PayrollResult = typeof payrollResults.$inferSelect;
export type NewPayrollResult = typeof payrollResults.$inferInsert;
