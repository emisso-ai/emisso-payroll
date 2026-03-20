import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculatePayroll, calculateEmployeePayroll } from '../src/calculator.js';
import { clearIndicatorCache } from '../src/fetch-indicators.js';
import type { EmployeePayrollInput, ReferenceData } from '../src/types.js';

const referenceData: ReferenceData = {
  uf: 38500,
  utm: 65967,
  uta: 791604,
  imm: 539000,
  afpRates: {
    capital: { commissionRate: 1.44, sisRate: 1.54 },
    habitat: { commissionRate: 1.27, sisRate: 1.54 },
  },
  fonasaRate: 7,
  taxBrackets: [
    { from: 0,    to: 13.5,  rate: 0,    deduction: 0 },
    { from: 13.5, to: 30,    rate: 4,    deduction: 0.54 },
    { from: 30,   to: 50,    rate: 8,    deduction: 1.74 },
    { from: 50,   to: 70,    rate: 13.5, deduction: 4.49 },
    { from: 70,   to: 90,    rate: 23,   deduction: 11.14 },
    { from: 90,   to: 120,   rate: 30.4, deduction: 17.8 },
    { from: 120,  to: 310,   rate: 35.5, deduction: 23.92 },
    { from: 310,  to: null,  rate: 40,   deduction: 37.87 },
  ],
  familyAllowanceBrackets: [
    { from: 0,       to: 539000,   amount: 18832 },
    { from: 539001,  to: 787000,   amount: 11554 },
    { from: 787001,  to: 1226759,  amount: 3651 },
    { from: 1226760, to: null,     amount: 0 },
  ],
  unemploymentRate: 0.6,
  mutualRate: 0.93,
};

const sampleEmployee: EmployeePayrollInput = {
  employeeId: '123e4567-e89b-12d3-a456-426614174000',
  rut: '12345678-9',
  firstName: 'Juan',
  lastName: 'Perez',
  baseSalary: 1_000_000,
  gratificationType: 'legal',
  colacion: 50000,
  movilizacion: 30000,
  afpCode: 'capital',
  afpFund: 'c',
  healthPlan: 'fonasa',
  familyAllowanceLoads: 2,
  earnings: [],
  deductions: [],
};

// Use a pre-reform date so pension reform = 0 for existing tests
const PRE_REFORM_DATE = new Date('2025-07-01');
// Use a Phase 1 reform date (2%) for reform-specific tests
const REFORM_PHASE1_DATE = new Date('2026-02-17');

describe('Payroll Calculator', () => {
  it('should calculate payroll for single employee', () => {
    const result = calculateEmployeePayroll(sampleEmployee, referenceData, PRE_REFORM_DATE);

    expect(result.employeeId).toBe(sampleEmployee.employeeId);

    // Earnings
    expect(result.earnings.baseSalary).toBe(1_000_000);
    expect(result.earnings.gratification).toBe(213354);
    expect(result.earnings.overtime).toBe(0);
    expect(result.earnings.bonuses).toBe(0);
    expect(result.earnings.totalImponible).toBe(1_213_354);
    expect(result.earnings.totalTaxable).toBe(1_213_354);
    expect(result.earnings.familyAllowance).toBe(7302);
    expect(result.earnings.totalNonTaxable).toBe(87302);

    // Deductions
    expect(result.deductions.afp).toBe(138808);
    expect(result.deductions.health).toBe(84935);
    expect(result.deductions.unemployment).toBe(7280);
    expect(result.deductions.apv).toBe(0);
    expect(result.deductions.incomeTax).toBe(18503);
    expect(result.deductions.additionalDeductions).toBe(0);
    expect(result.deductions.total).toBe(249526);

    expect(result.netPay).toBe(1_051_130);

    // Employer costs (pre-reform: pensionReform = 0)
    expect(result.employerCosts.mutual).toBe(11284);
    expect(result.employerCosts.sis).toBe(18686);
    expect(result.employerCosts.unemployment).toBe(29120);
    expect(result.employerCosts.pensionReform).toBe(0);
    expect(result.employerCosts.total).toBe(59090);
  });

  it('should calculate payroll for multiple employees', async () => {
    const secondEmployee: EmployeePayrollInput = {
      ...sampleEmployee,
      employeeId: '223e4567-e89b-12d3-a456-426614174001',
      baseSalary: 800_000,
    };

    const results = await calculatePayroll({
      employees: [sampleEmployee, secondEmployee],
      referenceData,
      periodYear: 2025,
      periodMonth: 7,
      periodDate: PRE_REFORM_DATE,
    });

    expect(results).toHaveLength(2);
    expect(results[0].employeeId).toBe(sampleEmployee.employeeId);
    expect(results[1].employeeId).toBe(secondEmployee.employeeId);
    expect(results[1].deductions.afp).toBeLessThan(results[0].deductions.afp);
  });

  it('should handle employees with different contract types', () => {
    const plazoFijoEmployee: EmployeePayrollInput = {
      ...sampleEmployee,
      contractType: 'plazo_fijo',
    };

    const indefinido = calculateEmployeePayroll(sampleEmployee, referenceData, PRE_REFORM_DATE);
    const plazoFijo = calculateEmployeePayroll(plazoFijoEmployee, referenceData, PRE_REFORM_DATE);

    expect(indefinido.deductions.unemployment).toBe(plazoFijo.deductions.unemployment);
    expect(plazoFijo.employerCosts.unemployment).toBeGreaterThan(indefinido.employerCosts.unemployment);
  });

  it('should apply gratification correctly', () => {
    const convenidaEmployee: EmployeePayrollInput = {
      ...sampleEmployee,
      gratificationType: 'convenida',
      gratificationAmount: 150000,
    };

    const noGratEmployee: EmployeePayrollInput = {
      ...sampleEmployee,
      gratificationType: 'none',
    };

    const legal = calculateEmployeePayroll(sampleEmployee, referenceData, PRE_REFORM_DATE);
    const convenida = calculateEmployeePayroll(convenidaEmployee, referenceData, PRE_REFORM_DATE);
    const none = calculateEmployeePayroll(noGratEmployee, referenceData, PRE_REFORM_DATE);

    expect(legal.earnings.gratification).toBe(213354);
    expect(convenida.earnings.gratification).toBe(150000);
    expect(none.earnings.gratification).toBe(0);
  });

  it('should calculate employer costs (pre-reform)', () => {
    const result = calculateEmployeePayroll(sampleEmployee, referenceData, PRE_REFORM_DATE);

    expect(result.employerCosts.mutual).toBeGreaterThan(0);
    expect(result.employerCosts.sis).toBeGreaterThan(0);
    expect(result.employerCosts.unemployment).toBeGreaterThan(0);
    expect(result.employerCosts.pensionReform).toBe(0);
    expect(result.employerCosts.total).toBe(
      result.employerCosts.mutual + result.employerCosts.sis + result.employerCosts.unemployment + result.employerCosts.pensionReform
    );
  });

  it('should include pension reform in employer costs (Phase 1: 2%)', () => {
    const result = calculateEmployeePayroll(sampleEmployee, referenceData, REFORM_PHASE1_DATE);

    expect(result.employerCosts.pensionReform).toBe(24267);
    expect(result.employerCosts.total).toBe(
      result.employerCosts.mutual + result.employerCosts.sis + result.employerCosts.unemployment + result.employerCosts.pensionReform
    );
  });

  it('should auto-resolve reference data when omitted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ uf: { valor: 38500 }, utm: { valor: 65967 } }),
    }));
    clearIndicatorCache();

    const results = await calculatePayroll({
      employees: [sampleEmployee],
      periodYear: 2025,
      periodMonth: 7,
      periodDate: PRE_REFORM_DATE,
    });

    expect(results).toHaveLength(1);
    expect(results[0].employeeId).toBe(sampleEmployee.employeeId);
    expect(results[0].netPay).toBeGreaterThan(0);
    expect(results[0].deductions.afp).toBeGreaterThan(0);

    vi.unstubAllGlobals();
    clearIndicatorCache();
  });

  it('should fall back to defaults when fetch fails and referenceData omitted', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    clearIndicatorCache();

    const results = await calculatePayroll({
      employees: [sampleEmployee],
      periodYear: 2025,
      periodMonth: 7,
      periodDate: PRE_REFORM_DATE,
    });

    expect(results).toHaveLength(1);
    expect(results[0].netPay).toBeGreaterThan(0);

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearIndicatorCache();
  });

  it('should handle additional earnings and deductions', () => {
    const employeeWithExtras: EmployeePayrollInput = {
      ...sampleEmployee,
      earnings: [
        { type: 'bonus', description: 'Bono productividad', amount: 200000, isTaxable: true, isImponible: true },
      ],
      deductions: [
        { type: 'loan', description: 'Prestamo empresa', amount: 50000 },
      ],
    };

    const result = calculateEmployeePayroll(employeeWithExtras, referenceData, PRE_REFORM_DATE);

    expect(result.earnings.bonuses).toBe(200000);
    expect(result.earnings.totalImponible).toBe(1_000_000 + 213354 + 200000);
    expect(result.deductions.additionalDeductions).toBe(50000);
    expect(result.netPay).toBeLessThan(
      calculateEmployeePayroll(sampleEmployee, referenceData, PRE_REFORM_DATE).netPay + 200000
    );
  });
});
