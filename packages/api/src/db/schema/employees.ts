import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { payrollSchema, tenants } from "./tenants";

// ── Enums ──────────────────────────────────────────────────────────

export const contractTypeEnum = payrollSchema.enum("contract_type", [
  "indefinido",
  "plazo_fijo",
  "por_obra",
]);

export const gratificationTypeEnum = payrollSchema.enum("gratification_type", [
  "legal",
  "convenida",
  "none",
]);

export const healthPlanTypeEnum = payrollSchema.enum("health_plan_type", [
  "fonasa",
  "isapre",
]);

export const afpFundTypeEnum = payrollSchema.enum("afp_fund_type", [
  "a",
  "b",
  "c",
  "d",
  "e",
]);

// ── Employees ──────────────────────────────────────────────────────

/**
 * Employee master data — includes identity, contract, and social security
 * in a single table. Pagatto split this across 3 tables (employees,
 * contracts, social_security) but the 1:1 relationship makes a flat
 * structure simpler for the API layer.
 */
export const employees = payrollSchema.table("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  // ── Identity ──
  rut: varchar("rut", { length: 12 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birth_date"),
  nationality: varchar("nationality", { length: 50 }).notNull().default("Chilena"),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),

  // ── Contract ──
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  contractType: contractTypeEnum("contract_type").notNull().default("indefinido"),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  position: varchar("position", { length: 255 }),
  workSchedule: varchar("work_schedule", { length: 255 }),

  // ── Compensation ──
  baseSalary: integer("base_salary").notNull(), // CLP
  gratificationType: gratificationTypeEnum("gratification_type")
    .notNull()
    .default("legal"),
  gratificationAmount: integer("gratification_amount").default(0), // CLP, for 'convenida'
  colacion: integer("colacion").default(0), // Lunch allowance (CLP)
  movilizacion: integer("movilizacion").default(0), // Transportation (CLP)

  // ── AFP (Pension) ──
  afpCode: varchar("afp_code", { length: 10 }).notNull(),
  afpFund: afpFundTypeEnum("afp_fund").notNull().default("c"),

  // ── Health Insurance ──
  healthPlan: healthPlanTypeEnum("health_plan").notNull().default("fonasa"),
  isapreCode: varchar("isapre_code", { length: 10 }),
  isapreName: varchar("isapre_name", { length: 100 }),
  isapreAmount: integer("isapre_amount").default(0), // Additional UF amount (CLP)

  // ── APV (Voluntary Pension) ──
  apvAmount: integer("apv_amount").default(0), // CLP
  apvPercentage: decimal("apv_percentage", { precision: 5, scale: 2 }).default("0"),

  // ── Family Allowance ──
  familyAllowanceLoads: integer("family_allowance_loads").notNull().default(0),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
