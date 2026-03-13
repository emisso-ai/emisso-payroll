import { integer, pgEnum, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";
import { employees } from "./employees";

/**
 * Deduction type enum
 */
export const deductionTypeEnum = payrollSchema.enum("deduction_type", [
  "loan",
  "advance",
  "legal_retention",
  "voluntary_savings",
  "other",
]);

/**
 * Additional deductions per employee per payroll run.
 * AFP, health, tax are calculated by the engine — these are extras.
 */
export const deductions = payrollSchema.table("deductions", {
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

  type: deductionTypeEnum("type").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: integer("amount").notNull(), // CLP

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Deduction = typeof deductions.$inferSelect;
export type NewDeduction = typeof deductions.$inferInsert;
