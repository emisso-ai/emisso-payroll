/**
 * PGLite test helper — creates an in-memory PostgreSQL instance
 * with the payroll schema applied via raw SQL DDL.
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";

/**
 * Creates a PGLite instance and applies the payroll schema.
 * Returns the raw PGLite instance and the Drizzle DB wrapper.
 */
export async function setupTestDb(): Promise<{
  pglite: PGlite;
  db: PgliteDatabase;
}> {
  const pglite = new PGlite();
  const db = drizzle(pglite);

  // Create the payroll schema and all tables
  await pglite.exec(SCHEMA_SQL);

  return { pglite, db };
}

/**
 * Truncates all tables in the payroll schema (for afterEach cleanup).
 */
export async function truncateAll(pglite: PGlite): Promise<void> {
  await pglite.exec(`
    TRUNCATE TABLE
      payroll.previred_files,
      payroll.payroll_results,
      payroll.earnings,
      payroll.deductions,
      payroll.payroll_runs,
      payroll.employees,
      payroll.reference_family_allowance,
      payroll.reference_tax_brackets,
      payroll.reference_afp_rates,
      payroll.reference_indicators,
      payroll.tenants
    CASCADE;
  `);
}

// ── Raw DDL for all tables ──────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS payroll;

-- Enums
DO $$ BEGIN
  CREATE TYPE payroll.deployment_mode AS ENUM ('self_hosted', 'managed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.contract_type AS ENUM ('indefinido', 'plazo_fijo', 'por_obra');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.gratification_type AS ENUM ('legal', 'convenida', 'none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.health_plan_type AS ENUM ('fonasa', 'isapre');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.afp_fund_type AS ENUM ('a', 'b', 'c', 'd', 'e');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.afp_provider AS ENUM ('capital', 'cuprum', 'habitat', 'planvital', 'provida', 'modelo', 'uno');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.payroll_run_status AS ENUM ('draft', 'calculating', 'calculated', 'approved', 'paid', 'voided');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.earning_type AS ENUM ('overtime', 'bonus', 'commission', 'allowance', 'reimbursement', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.deduction_type AS ENUM ('loan', 'advance', 'legal_retention', 'voluntary_savings', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll.family_allowance_tranche AS ENUM ('A', 'B', 'C', 'none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tenants
CREATE TABLE IF NOT EXISTS payroll.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(12) UNIQUE,
  mode payroll.deployment_mode NOT NULL DEFAULT 'self_hosted',
  business_name VARCHAR(255),
  trade_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address VARCHAR(500),
  city VARCHAR(100),
  region VARCHAR(100),
  mutual_safety_code VARCHAR(10),
  previred_code VARCHAR(20),
  config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE IF NOT EXISTS payroll.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  rut VARCHAR(12) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  birth_date DATE,
  nationality VARCHAR(50) NOT NULL DEFAULT 'Chilena',
  address VARCHAR(500),
  city VARCHAR(100),
  region VARCHAR(100),
  hire_date DATE NOT NULL,
  termination_date DATE,
  contract_type payroll.contract_type NOT NULL DEFAULT 'indefinido',
  contract_start_date DATE,
  contract_end_date DATE,
  position VARCHAR(255),
  work_schedule VARCHAR(255),
  base_salary INTEGER NOT NULL,
  gratification_type payroll.gratification_type NOT NULL DEFAULT 'legal',
  gratification_amount INTEGER DEFAULT 0,
  colacion INTEGER DEFAULT 0,
  movilizacion INTEGER DEFAULT 0,
  afp_code payroll.afp_provider NOT NULL,
  afp_fund payroll.afp_fund_type NOT NULL DEFAULT 'c',
  health_plan payroll.health_plan_type NOT NULL DEFAULT 'fonasa',
  isapre_code VARCHAR(10),
  isapre_name VARCHAR(100),
  isapre_amount INTEGER DEFAULT 0,
  apv_amount INTEGER DEFAULT 0,
  apv_percentage NUMERIC(5,2) DEFAULT 0,
  family_allowance_loads INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, rut)
);
CREATE INDEX IF NOT EXISTS pr_employees_tenant_active_idx ON payroll.employees(tenant_id, is_active);

-- Payroll runs
CREATE TABLE IF NOT EXISTS payroll.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE NOT NULL,
  status payroll.payroll_run_status NOT NULL DEFAULT 'draft',
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_gross_pay INTEGER DEFAULT 0,
  total_deductions INTEGER DEFAULT 0,
  total_net_pay INTEGER DEFAULT 0,
  notes VARCHAR(1000),
  calculated_at TIMESTAMP,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  voided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS pr_payroll_runs_tenant_period_idx ON payroll.payroll_runs(tenant_id, period_year, period_month);

-- Payroll results
CREATE TABLE IF NOT EXISTS payroll.payroll_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES payroll.employees(id) ON DELETE CASCADE,
  result_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);
CREATE INDEX IF NOT EXISTS pr_payroll_results_tenant_run_idx ON payroll.payroll_results(tenant_id, payroll_run_id);

-- Earnings
CREATE TABLE IF NOT EXISTS payroll.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES payroll.employees(id) ON DELETE CASCADE,
  type payroll.earning_type NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_imponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pr_earnings_tenant_run_employee_idx ON payroll.earnings(tenant_id, payroll_run_id, employee_id);

-- Deductions
CREATE TABLE IF NOT EXISTS payroll.deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES payroll.employees(id) ON DELETE CASCADE,
  type payroll.deduction_type NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pr_deductions_tenant_run_employee_idx ON payroll.deductions(tenant_id, payroll_run_id, employee_id);

-- Reference indicators
CREATE TABLE IF NOT EXISTS payroll.reference_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL UNIQUE,
  uf NUMERIC(10,2) NOT NULL,
  utm NUMERIC(10,2) NOT NULL,
  uta NUMERIC(10,2) NOT NULL,
  imm NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Reference AFP rates
CREATE TABLE IF NOT EXISTS payroll.reference_afp_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL,
  afp_provider payroll.afp_provider NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  sis_rate NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(effective_date, afp_provider)
);
CREATE INDEX IF NOT EXISTS pr_ref_afp_rates_effective_date_idx ON payroll.reference_afp_rates(effective_date);

-- Reference tax brackets
CREATE TABLE IF NOT EXISTS payroll.reference_tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL,
  bracket_index INTEGER NOT NULL,
  lower_bound_uf NUMERIC(10,2) NOT NULL,
  upper_bound_uf NUMERIC(10,2),
  marginal_rate NUMERIC(5,4) NOT NULL,
  fixed_amount_uf NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(effective_date, bracket_index)
);
CREATE INDEX IF NOT EXISTS pr_ref_tax_brackets_effective_date_idx ON payroll.reference_tax_brackets(effective_date);

-- Reference family allowance
CREATE TABLE IF NOT EXISTS payroll.reference_family_allowance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date DATE NOT NULL,
  bracket_index INTEGER NOT NULL,
  tranche payroll.family_allowance_tranche NOT NULL,
  lower_bound_clp NUMERIC(15,2) NOT NULL,
  upper_bound_clp NUMERIC(15,2),
  allowance_per_dependent_clp NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(effective_date, bracket_index)
);
CREATE INDEX IF NOT EXISTS pr_ref_family_allow_effective_date_idx ON payroll.reference_family_allowance(effective_date);

-- Previred files
CREATE TABLE IF NOT EXISTS payroll.previred_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES payroll.tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_runs(id) ON DELETE CASCADE,
  file_content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, payroll_run_id)
);
CREATE INDEX IF NOT EXISTS pr_previred_files_tenant_run_idx ON payroll.previred_files(tenant_id, payroll_run_id);
`;
