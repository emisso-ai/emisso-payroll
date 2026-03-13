/**
 * Test seed helpers — creates reference data and common entities.
 */

import type { PGlite } from "@electric-sql/pglite";

export const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_EMPLOYEE_ID = "00000000-0000-0000-0000-000000000010";
export const TEST_EMPLOYEE_ID_2 = "00000000-0000-0000-0000-000000000011";

export async function seedTenant(pglite: PGlite): Promise<void> {
  await pglite.exec(`
    INSERT INTO payroll.tenants (id, name, rut, business_name, config)
    VALUES (
      '${TEST_TENANT_ID}',
      'Test Company',
      '76.000.000-0',
      'Test Company SpA',
      '{"mutualRate": 0.93}'
    );
  `);
}

export async function seedEmployee(
  pglite: PGlite,
  opts?: { id?: string; rut?: string; isActive?: boolean },
): Promise<void> {
  const id = opts?.id ?? TEST_EMPLOYEE_ID;
  const rut = opts?.rut ?? "12345678-5";
  const isActive = opts?.isActive ?? true;

  await pglite.exec(`
    INSERT INTO payroll.employees (
      id, tenant_id, rut, first_name, last_name, hire_date,
      base_salary, afp_code, afp_fund, health_plan,
      family_allowance_loads, is_active
    ) VALUES (
      '${id}', '${TEST_TENANT_ID}', '${rut}', 'Juan', 'Pérez López',
      '2024-01-01', 1000000, 'capital', 'c', 'fonasa', 0, ${isActive}
    );
  `);
}

export async function seedPayrollRun(
  pglite: PGlite,
  opts?: { id?: string; status?: string; year?: number; month?: number },
): Promise<string> {
  const id = opts?.id ?? "00000000-0000-0000-0000-000000000020";
  const status = opts?.status ?? "draft";
  const year = opts?.year ?? 2026;
  const month = opts?.month ?? 3;

  await pglite.exec(`
    INSERT INTO payroll.payroll_runs (
      id, tenant_id, period_year, period_month,
      start_date, end_date, payment_date, status
    ) VALUES (
      '${id}', '${TEST_TENANT_ID}', ${year}, ${month},
      '${year}-${String(month).padStart(2, "0")}-01',
      '${year}-${String(month).padStart(2, "0")}-28',
      '${year}-${String(month).padStart(2, "0")}-28',
      '${status}'
    );
  `);

  return id;
}

export async function seedReferenceData(pglite: PGlite): Promise<void> {
  const date = "2026-03-01";

  // Indicators
  await pglite.exec(`
    INSERT INTO payroll.reference_indicators (effective_date, uf, utm, uta, imm)
    VALUES ('${date}', 38500.00, 66000.00, 792000.00, 500000.00);
  `);

  // AFP rates (2 providers for testing)
  await pglite.exec(`
    INSERT INTO payroll.reference_afp_rates (effective_date, afp_provider, commission_rate, sis_rate)
    VALUES
      ('${date}', 'capital', 1.44, 1.87),
      ('${date}', 'modelo', 0.58, 1.87);
  `);

  // Tax brackets (simplified: 3 brackets for tests)
  await pglite.exec(`
    INSERT INTO payroll.reference_tax_brackets (effective_date, bracket_index, lower_bound_uf, upper_bound_uf, marginal_rate, fixed_amount_uf)
    VALUES
      ('${date}', 0, 0.00, 13.50, 0.0000, 0.00),
      ('${date}', 1, 13.50, 30.00, 0.0400, 0.54),
      ('${date}', 2, 30.00, NULL, 0.0800, 1.74);
  `);

  // Family allowance (2 brackets for tests)
  await pglite.exec(`
    INSERT INTO payroll.reference_family_allowance (effective_date, bracket_index, tranche, lower_bound_clp, upper_bound_clp, allowance_per_dependent_clp)
    VALUES
      ('${date}', 0, 'A', 0, 529000.00, 18832.00),
      ('${date}', 1, 'B', 529000.01, 772000.00, 11553.00);
  `);
}
