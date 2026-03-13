import {
  boolean,
  jsonb,
  pgEnum,
  pgSchema,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const payrollSchema = pgSchema("payroll");

/**
 * Deployment mode enum
 */
export const deploymentModeEnum = payrollSchema.enum("deployment_mode", [
  "self_hosted",
  "managed",
]);

/**
 * Tenants table — registry of payroll tenants.
 * In managed mode, maps to an Emisso HQ team.
 * In self-hosted mode, represents the standalone deployment.
 */
export const tenants = payrollSchema.table("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 12 }).unique(),
  mode: deploymentModeEnum("mode").notNull().default("self_hosted"),

  // Company info for Previred / legal documents
  businessName: varchar("business_name", { length: 255 }),
  tradeName: varchar("trade_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  mutualSafetyCode: varchar("mutual_safety_code", { length: 10 }),
  previredCode: varchar("previred_code", { length: 20 }),

  /** Tenant-level config (mutual rate, custom settings, etc.) */
  config: jsonb("config").$type<TenantConfig>(),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface TenantConfig {
  mutualRate?: number;
  /** Emisso HQ team ID for managed mode */
  emissoTeamId?: string;
}

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
