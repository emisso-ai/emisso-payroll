import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";
import { payrollRuns } from "./payroll-runs";

/**
 * Generated Previred DDJJ files, stored as text content.
 *
 * Note: file_content can be large. Listing queries should exclude it
 * and only fetch when downloading a specific file.
 */
export const previredFiles = payrollSchema.table(
  "previred_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),

    /** Full Previred file content (semicolon-delimited text) */
    fileContent: text("file_content").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tenantRunIdx: index("pr_previred_files_tenant_run_idx").on(
      table.tenantId,
      table.payrollRunId,
    ),
  }),
);

export type PreviredFile = typeof previredFiles.$inferSelect;
export type NewPreviredFile = typeof previredFiles.$inferInsert;
