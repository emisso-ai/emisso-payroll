import {
  boolean,
  integer,
  pgEnum,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";
import { employees } from "./employees";

/**
 * Earning type enum
 */
export const earningTypeEnum = payrollSchema.enum("earning_type", [
  "overtime",
  "bonus",
  "commission",
  "allowance",
  "reimbursement",
  "other",
]);

/**
 * Variable earnings per employee per payroll run.
 * Base salary comes from employee record — these are additional compensation items.
 */
export const earnings = payrollSchema.table("earnings", {
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

  type: earningTypeEnum("type").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: integer("amount").notNull(), // CLP

  isTaxable: boolean("is_taxable").notNull().default(true),
  isImponible: boolean("is_imponible").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Earning = typeof earnings.$inferSelect;
export type NewEarning = typeof earnings.$inferInsert;
