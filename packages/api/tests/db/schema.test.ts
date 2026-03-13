import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  tenants,
  employees,
  payrollRuns,
  payrollResults,
  earnings,
  deductions,
  referenceIndicators,
  referenceAfpRates,
  referenceTaxBrackets,
  referenceFamilyAllowance,
  previredFiles,
  payrollSchema,
} from "../../src/db/schema/index";

describe("payroll schema", () => {
  it("uses the 'payroll' PostgreSQL schema", () => {
    expect(payrollSchema.schemaName).toBe("payroll");
  });

  describe("tenants table", () => {
    it("has correct table name", () => {
      const config = getTableConfig(tenants);
      expect(config.name).toBe("tenants");
      expect(config.schema).toBe("payroll");
    });

    it("has required columns", () => {
      const config = getTableConfig(tenants);
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("id");
      expect(colNames).toContain("name");
      expect(colNames).toContain("rut");
      expect(colNames).toContain("mode");
      expect(colNames).toContain("config");
      expect(colNames).toContain("is_active");
    });
  });

  describe("employees table", () => {
    it("has correct table name and schema", () => {
      const config = getTableConfig(employees);
      expect(config.name).toBe("employees");
      expect(config.schema).toBe("payroll");
    });

    it("has tenant_id column for RLS", () => {
      const config = getTableConfig(employees);
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
    });

    it("has all identity, contract, compensation, and social security columns", () => {
      const config = getTableConfig(employees);
      const colNames = config.columns.map((c) => c.name);

      // Identity
      expect(colNames).toContain("rut");
      expect(colNames).toContain("first_name");
      expect(colNames).toContain("last_name");

      // Contract
      expect(colNames).toContain("hire_date");
      expect(colNames).toContain("contract_type");
      expect(colNames).toContain("position");

      // Compensation
      expect(colNames).toContain("base_salary");
      expect(colNames).toContain("gratification_type");
      expect(colNames).toContain("colacion");
      expect(colNames).toContain("movilizacion");

      // Social security
      expect(colNames).toContain("afp_code");
      expect(colNames).toContain("afp_fund");
      expect(colNames).toContain("health_plan");
      expect(colNames).toContain("family_allowance_loads");
    });
  });

  describe("payroll runs table", () => {
    it("has correct structure", () => {
      const config = getTableConfig(payrollRuns);
      expect(config.name).toBe("payroll_runs");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
      expect(colNames).toContain("period_year");
      expect(colNames).toContain("period_month");
      expect(colNames).toContain("status");
    });
  });

  describe("payroll results table", () => {
    it("stores individual calculation results", () => {
      const config = getTableConfig(payrollResults);
      expect(config.name).toBe("payroll_results");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
      expect(colNames).toContain("payroll_run_id");
      expect(colNames).toContain("employee_id");
      expect(colNames).toContain("result_json");
    });
  });

  describe("earnings table", () => {
    it("has correct structure", () => {
      const config = getTableConfig(earnings);
      expect(config.name).toBe("earnings");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
      expect(colNames).toContain("payroll_run_id");
      expect(colNames).toContain("employee_id");
      expect(colNames).toContain("type");
      expect(colNames).toContain("amount");
      expect(colNames).toContain("is_taxable");
      expect(colNames).toContain("is_imponible");
    });
  });

  describe("deductions table", () => {
    it("has correct structure", () => {
      const config = getTableConfig(deductions);
      expect(config.name).toBe("deductions");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
      expect(colNames).toContain("payroll_run_id");
      expect(colNames).toContain("employee_id");
      expect(colNames).toContain("type");
      expect(colNames).toContain("amount");
    });
  });

  describe("reference data tables", () => {
    it("reference_indicators has correct structure", () => {
      const config = getTableConfig(referenceIndicators);
      expect(config.name).toBe("reference_indicators");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("effective_date");
      expect(colNames).toContain("uf");
      expect(colNames).toContain("utm");
      expect(colNames).toContain("uta");
      expect(colNames).toContain("imm");
    });

    it("reference_afp_rates has correct structure", () => {
      const config = getTableConfig(referenceAfpRates);
      expect(config.name).toBe("reference_afp_rates");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("effective_date");
      expect(colNames).toContain("afp_provider");
      expect(colNames).toContain("commission_rate");
      expect(colNames).toContain("sis_rate");
    });

    it("reference_tax_brackets has correct structure", () => {
      const config = getTableConfig(referenceTaxBrackets);
      expect(config.name).toBe("reference_tax_brackets");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("effective_date");
      expect(colNames).toContain("bracket_index");
      expect(colNames).toContain("lower_bound_uf");
      expect(colNames).toContain("upper_bound_uf");
      expect(colNames).toContain("marginal_rate");
      expect(colNames).toContain("fixed_amount_uf");
    });

    it("reference_family_allowance has correct structure", () => {
      const config = getTableConfig(referenceFamilyAllowance);
      expect(config.name).toBe("reference_family_allowance");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("effective_date");
      expect(colNames).toContain("bracket_index");
      expect(colNames).toContain("tranche");
      expect(colNames).toContain("lower_bound_clp");
      expect(colNames).toContain("upper_bound_clp");
      expect(colNames).toContain("allowance_per_dependent_clp");
    });
  });

  describe("previred files table", () => {
    it("has correct structure", () => {
      const config = getTableConfig(previredFiles);
      expect(config.name).toBe("previred_files");
      expect(config.schema).toBe("payroll");
      const colNames = config.columns.map((c) => c.name);
      expect(colNames).toContain("tenant_id");
      expect(colNames).toContain("payroll_run_id");
      expect(colNames).toContain("file_content");
    });
  });

  describe("indexes and unique constraints", () => {
    it("employees has unique constraint on (tenant_id, rut)", () => {
      const config = getTableConfig(employees);
      const uniqueConstraints = config.uniqueConstraints;
      const tenantRut = uniqueConstraints.find(
        (u) => u.name === "pr_employees_tenant_rut_unq",
      );
      expect(tenantRut).toBeDefined();
    });

    it("payroll_runs has unique constraint on (tenant_id, year, month)", () => {
      const config = getTableConfig(payrollRuns);
      const uniqueConstraints = config.uniqueConstraints;
      const tenantPeriod = uniqueConstraints.find(
        (u) => u.name === "pr_payroll_runs_tenant_period_unq",
      );
      expect(tenantPeriod).toBeDefined();
    });

    it("payroll_results has unique constraint on (run_id, employee_id)", () => {
      const config = getTableConfig(payrollResults);
      const uniqueConstraints = config.uniqueConstraints;
      const runEmployee = uniqueConstraints.find(
        (u) => u.name === "pr_payroll_results_run_employee_unq",
      );
      expect(runEmployee).toBeDefined();
    });

    it("tenant-scoped tables have tenant_id indexes", () => {
      const tablesWithIndexes = [
        { table: employees, indexName: "pr_employees_tenant_active_idx" },
        { table: payrollRuns, indexName: "pr_payroll_runs_tenant_period_idx" },
        { table: payrollResults, indexName: "pr_payroll_results_tenant_run_idx" },
        { table: earnings, indexName: "pr_earnings_tenant_run_employee_idx" },
        { table: deductions, indexName: "pr_deductions_tenant_run_employee_idx" },
        { table: previredFiles, indexName: "pr_previred_files_tenant_run_idx" },
      ];

      for (const { table, indexName } of tablesWithIndexes) {
        const config = getTableConfig(table);
        const idx = config.indexes.find((i) => i.config.name === indexName);
        expect(idx, `Missing index ${indexName}`).toBeDefined();
      }
    });
  });

  describe("all tenant-scoped tables have tenant_id", () => {
    const tenantScopedTables = [
      { name: "employees", table: employees },
      { name: "payroll_runs", table: payrollRuns },
      { name: "payroll_results", table: payrollResults },
      { name: "earnings", table: earnings },
      { name: "deductions", table: deductions },
      { name: "previred_files", table: previredFiles },
    ];

    for (const { name, table } of tenantScopedTables) {
      it(`${name} has tenant_id`, () => {
        const config = getTableConfig(table);
        const tenantCol = config.columns.find((c) => c.name === "tenant_id");
        expect(tenantCol).toBeDefined();
        expect(tenantCol!.notNull).toBe(true);
      });
    }
  });
});
