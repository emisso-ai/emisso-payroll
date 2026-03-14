CREATE SCHEMA "payroll";
--> statement-breakpoint
CREATE TYPE "payroll"."afp_fund_type" AS ENUM('a', 'b', 'c', 'd', 'e');--> statement-breakpoint
CREATE TYPE "payroll"."afp_provider" AS ENUM('capital', 'cuprum', 'habitat', 'planvital', 'provida', 'modelo', 'uno');--> statement-breakpoint
CREATE TYPE "payroll"."contract_type" AS ENUM('indefinido', 'plazo_fijo', 'por_obra');--> statement-breakpoint
CREATE TYPE "payroll"."deduction_type" AS ENUM('loan', 'advance', 'legal_retention', 'voluntary_savings', 'other');--> statement-breakpoint
CREATE TYPE "payroll"."deployment_mode" AS ENUM('self_hosted', 'managed');--> statement-breakpoint
CREATE TYPE "payroll"."earning_type" AS ENUM('overtime', 'bonus', 'commission', 'allowance', 'reimbursement', 'other');--> statement-breakpoint
CREATE TYPE "payroll"."family_allowance_tranche" AS ENUM('A', 'B', 'C', 'none');--> statement-breakpoint
CREATE TYPE "payroll"."gratification_type" AS ENUM('legal', 'convenida', 'none');--> statement-breakpoint
CREATE TYPE "payroll"."health_plan_type" AS ENUM('fonasa', 'isapre');--> statement-breakpoint
CREATE TYPE "payroll"."payroll_run_status" AS ENUM('draft', 'calculated', 'approved', 'paid', 'voided');--> statement-breakpoint
CREATE TABLE "payroll"."deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "payroll"."deduction_type" NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll"."earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "payroll"."earning_type" NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL,
	"is_imponible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll"."employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rut" varchar(12) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"birth_date" date,
	"nationality" varchar(50) DEFAULT 'Chilena' NOT NULL,
	"address" varchar(500),
	"city" varchar(100),
	"region" varchar(100),
	"hire_date" date NOT NULL,
	"termination_date" date,
	"contract_type" "payroll"."contract_type" DEFAULT 'indefinido' NOT NULL,
	"contract_start_date" date,
	"contract_end_date" date,
	"position" varchar(255),
	"work_schedule" varchar(255),
	"base_salary" integer NOT NULL,
	"gratification_type" "payroll"."gratification_type" DEFAULT 'legal' NOT NULL,
	"gratification_amount" integer DEFAULT 0,
	"colacion" integer DEFAULT 0,
	"movilizacion" integer DEFAULT 0,
	"afp_code" "payroll"."afp_provider" NOT NULL,
	"afp_fund" "payroll"."afp_fund_type" DEFAULT 'c' NOT NULL,
	"health_plan" "payroll"."health_plan_type" DEFAULT 'fonasa' NOT NULL,
	"isapre_code" varchar(10),
	"isapre_name" varchar(100),
	"isapre_amount" integer DEFAULT 0,
	"apv_amount" integer DEFAULT 0,
	"apv_percentage" numeric(5, 2) DEFAULT '0',
	"family_allowance_loads" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_employees_tenant_rut_unq" UNIQUE("tenant_id","rut")
);
--> statement-breakpoint
CREATE TABLE "payroll"."payroll_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_payroll_results_run_employee_unq" UNIQUE("payroll_run_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "payroll"."payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"payment_date" date NOT NULL,
	"status" "payroll"."payroll_run_status" DEFAULT 'draft' NOT NULL,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"total_gross_pay" integer DEFAULT 0,
	"total_deductions" integer DEFAULT 0,
	"total_net_pay" integer DEFAULT 0,
	"notes" varchar(1000),
	"calculated_at" timestamp,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"voided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_payroll_runs_tenant_period_unq" UNIQUE("tenant_id","period_year","period_month")
);
--> statement-breakpoint
CREATE TABLE "payroll"."previred_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"file_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll"."reference_afp_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"effective_date" date NOT NULL,
	"afp_provider" "payroll"."afp_provider" NOT NULL,
	"commission_rate" numeric(5, 2) NOT NULL,
	"sis_rate" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_ref_afp_rates_date_provider" UNIQUE("effective_date","afp_provider")
);
--> statement-breakpoint
CREATE TABLE "payroll"."reference_family_allowance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"effective_date" date NOT NULL,
	"bracket_index" integer NOT NULL,
	"tranche" "payroll"."family_allowance_tranche" NOT NULL,
	"lower_bound_clp" numeric(15, 2) NOT NULL,
	"upper_bound_clp" numeric(15, 2),
	"allowance_per_dependent_clp" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_ref_family_allow_date_idx_unq" UNIQUE("effective_date","bracket_index")
);
--> statement-breakpoint
CREATE TABLE "payroll"."reference_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"effective_date" date NOT NULL,
	"uf" numeric(10, 2) NOT NULL,
	"utm" numeric(10, 2) NOT NULL,
	"uta" numeric(10, 2) NOT NULL,
	"imm" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reference_indicators_effective_date_unique" UNIQUE("effective_date")
);
--> statement-breakpoint
CREATE TABLE "payroll"."reference_tax_brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"effective_date" date NOT NULL,
	"bracket_index" integer NOT NULL,
	"lower_bound_uf" numeric(10, 2) NOT NULL,
	"upper_bound_uf" numeric(10, 2),
	"marginal_rate" numeric(5, 4) NOT NULL,
	"fixed_amount_uf" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_ref_tax_brackets_date_idx_unq" UNIQUE("effective_date","bracket_index")
);
--> statement-breakpoint
CREATE TABLE "payroll"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"rut" varchar(12),
	"mode" "payroll"."deployment_mode" DEFAULT 'self_hosted' NOT NULL,
	"business_name" varchar(255),
	"trade_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"address" varchar(500),
	"city" varchar(100),
	"region" varchar(100),
	"mutual_safety_code" varchar(10),
	"previred_code" varchar(20),
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_rut_unique" UNIQUE("rut")
);
--> statement-breakpoint
ALTER TABLE "payroll"."deductions" ADD CONSTRAINT "deductions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."deductions" ADD CONSTRAINT "deductions_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."deductions" ADD CONSTRAINT "deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "payroll"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."earnings" ADD CONSTRAINT "earnings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."earnings" ADD CONSTRAINT "earnings_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."earnings" ADD CONSTRAINT "earnings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "payroll"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."payroll_results" ADD CONSTRAINT "payroll_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."payroll_results" ADD CONSTRAINT "payroll_results_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."payroll_results" ADD CONSTRAINT "payroll_results_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "payroll"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."previred_files" ADD CONSTRAINT "previred_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "payroll"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll"."previred_files" ADD CONSTRAINT "previred_files_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pr_deductions_tenant_run_employee_idx" ON "payroll"."deductions" USING btree ("tenant_id","payroll_run_id","employee_id");--> statement-breakpoint
CREATE INDEX "pr_earnings_tenant_run_employee_idx" ON "payroll"."earnings" USING btree ("tenant_id","payroll_run_id","employee_id");--> statement-breakpoint
CREATE INDEX "pr_employees_tenant_active_idx" ON "payroll"."employees" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "pr_payroll_results_tenant_run_idx" ON "payroll"."payroll_results" USING btree ("tenant_id","payroll_run_id");--> statement-breakpoint
CREATE INDEX "pr_payroll_runs_tenant_period_idx" ON "payroll"."payroll_runs" USING btree ("tenant_id","period_year","period_month");--> statement-breakpoint
CREATE INDEX "pr_previred_files_tenant_run_idx" ON "payroll"."previred_files" USING btree ("tenant_id","payroll_run_id");--> statement-breakpoint
CREATE INDEX "pr_ref_afp_rates_effective_date_idx" ON "payroll"."reference_afp_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "pr_ref_family_allow_effective_date_idx" ON "payroll"."reference_family_allowance" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "pr_ref_tax_brackets_effective_date_idx" ON "payroll"."reference_tax_brackets" USING btree ("effective_date");