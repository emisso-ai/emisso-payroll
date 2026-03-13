import { jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CalculationResult } from "@emisso/payroll";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";
import { employees } from "./employees";

/**
 * Payroll results — individual calculation results per employee per run.
 * Stores the full CalculationResult from the engine as JSONB.
 */
export const payrollResults = payrollSchema.table("payroll_results", {
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
});

export type PayrollResult = typeof payrollResults.$inferSelect;
export type NewPayrollResult = typeof payrollResults.$inferInsert;
