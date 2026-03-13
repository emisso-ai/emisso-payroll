import {
  date,
  index,
  integer,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";

/**
 * Payroll run status enum
 */
export const payrollRunStatusEnum = payrollSchema.enum("payroll_run_status", [
  "draft",
  "calculated",
  "approved",
  "paid",
  "voided",
]);

/**
 * Payroll runs — monthly payroll batches.
 * Each run calculates payroll for all active employees in a period.
 */
export const payrollRuns = payrollSchema.table(
  "payroll_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    periodYear: integer("period_year").notNull(),
    periodMonth: integer("period_month").notNull(), // 1-12

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    paymentDate: date("payment_date").notNull(),

    status: payrollRunStatusEnum("status").notNull().default("draft"),

    // Aggregated totals — recalculated by PayrollService after mutations to payroll_results
    totalEmployees: integer("total_employees").notNull().default(0),
    totalGrossPay: integer("total_gross_pay").default(0), // CLP
    totalDeductions: integer("total_deductions").default(0), // CLP
    totalNetPay: integer("total_net_pay").default(0), // CLP

    notes: varchar("notes", { length: 1000 }),

    calculatedAt: timestamp("calculated_at"),
    approvedAt: timestamp("approved_at"),
    paidAt: timestamp("paid_at"),
    voidedAt: timestamp("voided_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    tenantPeriodIdx: index("pr_payroll_runs_tenant_period_idx").on(
      table.tenantId,
      table.periodYear,
      table.periodMonth,
    ),
    uniqueTenantPeriod: unique("pr_payroll_runs_tenant_period_unq").on(
      table.tenantId,
      table.periodYear,
      table.periodMonth,
    ),
  }),
);

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
