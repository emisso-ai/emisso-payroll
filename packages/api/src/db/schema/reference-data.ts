import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { payrollSchema } from "./tenants";

// ── Economic Indicators ────────────────────────────────────────────

/**
 * Reference indicators — UF, UTM, UTA, IMM.
 * Global (shared across tenants), keyed by effective date.
 */
export const referenceIndicators = payrollSchema.table(
  "reference_indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    effectiveDate: date("effective_date").notNull().unique(),
    uf: numeric("uf", { precision: 10, scale: 2 }).notNull(),
    utm: numeric("utm", { precision: 10, scale: 2 }).notNull(),
    uta: numeric("uta", { precision: 10, scale: 2 }).notNull(),
    imm: numeric("imm", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    effectiveDateIdx: index("pr_ref_indicators_effective_date_idx").on(
      table.effectiveDate,
    ),
  }),
);

export type ReferenceIndicator = typeof referenceIndicators.$inferSelect;
export type NewReferenceIndicator = typeof referenceIndicators.$inferInsert;

// ── AFP Rates ──────────────────────────────────────────────────────

export const afpProviderEnum = payrollSchema.enum("afp_provider", [
  "capital",
  "cuprum",
  "habitat",
  "planvital",
  "provida",
  "modelo",
  "uno",
]);

/**
 * AFP commission and SIS rates per provider, with temporal versioning.
 */
export const referenceAfpRates = payrollSchema.table(
  "reference_afp_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    effectiveDate: date("effective_date").notNull(),
    afpProvider: afpProviderEnum("afp_provider").notNull(),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull(),
    sisRate: numeric("sis_rate", { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueEffectiveDateProvider: unique("pr_ref_afp_rates_date_provider").on(
      table.effectiveDate,
      table.afpProvider,
    ),
    effectiveDateIdx: index("pr_ref_afp_rates_effective_date_idx").on(
      table.effectiveDate,
    ),
  }),
);

export type ReferenceAfpRate = typeof referenceAfpRates.$inferSelect;
export type NewReferenceAfpRate = typeof referenceAfpRates.$inferInsert;

// ── Tax Brackets ───────────────────────────────────────────────────

/**
 * Progressive income tax brackets (8 brackets, denominated in UF).
 */
export const referenceTaxBrackets = payrollSchema.table(
  "reference_tax_brackets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    effectiveDate: date("effective_date").notNull(),
    bracketIndex: integer("bracket_index").notNull(), // 0-7
    lowerBoundUf: numeric("lower_bound_uf", { precision: 10, scale: 2 }).notNull(),
    upperBoundUf: numeric("upper_bound_uf", { precision: 10, scale: 2 }), // null = no cap
    marginalRate: numeric("marginal_rate", { precision: 5, scale: 4 }).notNull(),
    fixedAmountUf: numeric("fixed_amount_uf", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueEffectiveDateBracket: unique("pr_ref_tax_brackets_date_idx_unq").on(
      table.effectiveDate,
      table.bracketIndex,
    ),
    effectiveDateIdx: index("pr_ref_tax_brackets_effective_date_idx").on(
      table.effectiveDate,
    ),
  }),
);

export type ReferenceTaxBracket = typeof referenceTaxBrackets.$inferSelect;
export type NewReferenceTaxBracket = typeof referenceTaxBrackets.$inferInsert;

// ── Family Allowance Brackets ──────────────────────────────────────

export const familyAllowanceTrancheEnum = payrollSchema.enum(
  "family_allowance_tranche",
  ["A", "B", "C", "none"],
);

/**
 * Family allowance (Asignación Familiar) income brackets.
 */
export const referenceFamilyAllowance = payrollSchema.table(
  "reference_family_allowance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    effectiveDate: date("effective_date").notNull(),
    bracketIndex: integer("bracket_index").notNull(), // 0-3
    tranche: familyAllowanceTrancheEnum("tranche").notNull(),
    lowerBoundClp: numeric("lower_bound_clp", { precision: 15, scale: 2 }).notNull(),
    upperBoundClp: numeric("upper_bound_clp", { precision: 15, scale: 2 }),
    allowancePerDependentClp: numeric("allowance_per_dependent_clp", {
      precision: 10,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueEffectiveDateBracket: unique("pr_ref_family_allow_date_idx_unq").on(
      table.effectiveDate,
      table.bracketIndex,
    ),
    effectiveDateIdx: index("pr_ref_family_allow_effective_date_idx").on(
      table.effectiveDate,
    ),
  }),
);

export type ReferenceFamilyAllowance =
  typeof referenceFamilyAllowance.$inferSelect;
export type NewReferenceFamilyAllowance =
  typeof referenceFamilyAllowance.$inferInsert;
