import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";

/**
 * Generated Previred DDJJ files, stored as text content.
 */
export const previredFiles = payrollSchema.table("previred_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  payrollRunId: uuid("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),

  /** Full Previred file content (semicolon-delimited text) */
  fileContent: text("file_content").notNull(),

  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PreviredFile = typeof previredFiles.$inferSelect;
export type NewPreviredFile = typeof previredFiles.$inferInsert;
