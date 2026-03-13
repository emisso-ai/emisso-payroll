/**
 * Cross-validation test suite for the Chilean payroll engine.
 *
 * Each scenario represents a specific employee situation with manually verified
 * expected values. These tests validate the full calculation pipeline end-to-end.
 *
 * Reference data reflects current 2026 Chilean values.
 * All monetary values are integer CLP.
 *
 * Math verification method for each scenario:
 *   gratification(legal) = round(min(base * 0.25, 4.75 * IMM / 12))
 *   totalImponible        = base + gratification + imponibleEarnings
 *   AFP                   = round(min(totalImponible, 81.6 * UF) * afpRate / 100)
 *   health(fonasa)        = round(totalImponible * 7 / 100)
 *   health(isapre)        = max(round(totalImponible * 7 / 100), round(isapreUF * UF))
 *   unemployment(emp)     = round(totalImponible * 0.6 / 100)
 *   incomeTaxBase         = totalTaxable - AFP - health - APV - unemployment
 *   incomeTax             = bracket formula applied in UF
 *   netPay                = totalEarnings - totalDeductions
 *   SIS                   = round(min(totalImponible, 81.6 * UF) * sisRate / 100)
 *   empUnemployment       = round(totalImponible * (2.4% indefinido | 3.0% plazo_fijo))
 *   pensionReform         = round(min(totalImponible, 81.6 * UF) * 2%) [Phase 1, Feb 2026]
 */

import { describe, expect, it } from 'vitest';
import { calculateEmployeePayroll } from '../src/calculator.js';
import type { EmployeePayrollInput, ReferenceData } from '../src/types.js';

// ---------------------------------------------------------------------------
// Shared reference data — 2026 Chilean payroll values
// ---------------------------------------------------------------------------

const REF: ReferenceData = {
  uf: 38500,
  utm: 65967,
  uta: 791604,
  imm: 539000,
  afpRates: {
    capital:   { commissionRate: 1.44, sisRate: 1.54 },
    cuprum:    { commissionRate: 1.44, sisRate: 1.54 },
    habitat:   { commissionRate: 1.27, sisRate: 1.54 },
    modelo:    { commissionRate: 0.58, sisRate: 1.54 },
    planvital: { commissionRate: 1.16, sisRate: 1.54 },
    provida:   { commissionRate: 1.45, sisRate: 1.54 },
    uno:       { commissionRate: 0.46, sisRate: 1.54 },
  },
  fonasaRate: 7,
  // Tax brackets: from/to in UF, rate in %, deduction in UF
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
  // Family allowance brackets: from/to in CLP, amount per load in CLP
  familyAllowanceBrackets: [
    { from: 0,       to: 539000,   amount: 18832 },
    { from: 539001,  to: 787000,   amount: 11554 },
    { from: 787001,  to: 1226759,  amount: 3651 },
    { from: 1226760, to: null,     amount: 0 },
  ],
  unemploymentRate: 0.6,
  mutualRate: 0.93,
};

// Period date: 2026-02-17 falls in pension reform Phase 1 (2% rate).
// Phase 1 is active from 2025-08-01 until 2026-07-31.
const PERIOD_DATE = new Date('2026-02-17');

// ---------------------------------------------------------------------------
// Helper to build a minimal valid EmployeePayrollInput with safe defaults
// ---------------------------------------------------------------------------

function makeEmployee(overrides: Partial<EmployeePayrollInput>): EmployeePayrollInput {
  return {
    employeeId: '00000000-0000-0000-0000-000000000001',
    rut: '12345678-9',
    firstName: 'Test',
    lastName: 'Employee',
    baseSalary: 539000,
    gratificationType: 'legal',
    colacion: 0,
    movilizacion: 0,
    afpCode: 'modelo',
    afpFund: 'c',
    healthPlan: 'fonasa',
    familyAllowanceLoads: 0,
    contractType: 'indefinido',
    earnings: [],
    deductions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Minimum wage employee — Fonasa, AFP Modelo, no extras
// ---------------------------------------------------------------------------
//
// baseSalary    = 539000 (IMM)
// gratification = round(min(539000 * 0.25, 4.75 * 539000 / 12))
//               = round(min(134750, 213354.17)) = 134750  [25% wins]
// totalImponible= 539000 + 134750 = 673750
// AFP  (Modelo 0.58%) = round(673750 * 0.0058)  = 3908
// health (7%)         = round(673750 * 0.07)    = 47163
// unem employee (0.6%)= round(673750 * 0.006)   = 4043
// incomeTaxBase = 673750 - 3908 - 47163 - 4043  = 618636
// 618636 / 38500 = 16.0685 UF -> bracket [13.5,30) rate 4% deduction 0.54
// taxInUF = 16.0685 * 0.04 - 0.54 = 0.10274
// tax = round(0.10274 * 38500)                  = 3955
// totalEarnings      = 673750
// totalDeductions    = 3908 + 47163 + 4043 + 3955 = 59069
// netPay             = 673750 - 59069            = 614681
// SIS  (1.54%)       = round(673750 * 0.0154)   = 10376
// mutual (0.93%)     = round(673750 * 0.0093)   = 6266
// empUnemployment (2.4% indefinido) = round(673750 * 0.024) = 16170
// pensionReform (2%) = round(673750 * 0.02)     = 13475
// ---------------------------------------------------------------------------

describe('Scenario 1: Minimum wage, Fonasa, AFP Modelo', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000001',
    baseSalary: 539000,
    afpCode: 'modelo',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'legal',
    colacion: 0,
    movilizacion: 0,
    familyAllowanceLoads: 0,
  });

  it('computes gratification via 25% rule (25% wins at minimum wage)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(134750);
  });

  it('computes correct totalImponible', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(673750);
  });

  it('computes correct AFP deduction (Modelo 0.58%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(3908);
  });

  it('computes correct health deduction (Fonasa 7%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(47163);
  });

  it('computes correct unemployment deduction (employee 0.6%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(4043);
  });

  it('computes correct income tax (bracket 2: 4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(3955);
  });

  it('computes correct net pay', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(614681);
  });

  it('computes correct employer SIS cost (Modelo 1.54%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(10376);
  });

  it('computes correct employer unemployment cost (indefinido 2.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(16170);
  });

  it('computes correct pension reform employer cost (Phase 1: 2%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(13475);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Mid-range salary — Fonasa, AFP Capital, colacion + movilizacion,
//             2 family loads
// ---------------------------------------------------------------------------
//
// baseSalary    = 1200000
// gratification = round(min(300000, 213354.17)) = 213354  [cap wins]
// totalImponible= 1200000 + 213354 = 1413354
// AFP  (Capital 1.44%) = round(1413354 * 0.0144) = 20352
// health (7%)          = round(1413354 * 0.07)   = 98935
// unem (0.6%)          = round(1413354 * 0.006)  = 8480
// incomeTaxBase = 1413354 - 20352 - 98935 - 8480 = 1285587
// 1285587 / 38500 = 33.3919 UF -> bracket [30,50) rate 8% deduction 1.74
// taxInUF = 33.3919 * 0.08 - 1.74 = 0.93135
// tax = round(0.93135 * 38500)               = 35857
// familyAllowance: base=1200000 in [787001,1226759] -> 3651 * 2 = 7302
// colacion=50000, movilizacion=30000 (non-imponible, non-taxable, included in pay)
// totalEarnings = 1200000 + 213354 + 7302 + 50000 + 30000 = 1500656
// totalDeductions= 20352 + 98935 + 8480 + 35857 = 163624
// netPay         = 1500656 - 163624            = 1337032
// SIS  (1.54%)       = round(1413354 * 0.0154) = 21766
// mutual (0.93%)     = round(1413354 * 0.0093) = 13144
// empUnemployment    = round(1413354 * 0.024)  = 33920
// pensionReform (2%) = round(1413354 * 0.02)   = 28267
// ---------------------------------------------------------------------------

describe('Scenario 2: Mid-range salary, Fonasa, AFP Capital, colacion + movilizacion, 2 family loads', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000002',
    baseSalary: 1200000,
    afpCode: 'capital',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'legal',
    colacion: 50000,
    movilizacion: 30000,
    familyAllowanceLoads: 2,
  });

  it('computes gratification capped at 4.75 IMM/12', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(213354);
  });

  it('computes family allowance (tramo C: 3651 CLP x 2 loads)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.familyAllowance).toBe(7302);
  });

  it('excludes colacion and movilizacion from totalImponible', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(1413354);
  });

  it('computes correct AFP deduction (Capital 1.44%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(20352);
  });

  it('computes correct health deduction (Fonasa 7%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(98935);
  });

  it('computes correct unemployment deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(8480);
  });

  it('computes correct income tax (bracket 3: 8%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(35857);
  });

  it('computes correct net pay (colacion + movilizacion + family allowance included)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(1337032);
  });

  it('computes correct employer SIS cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(21766);
  });

  it('computes correct employer unemployment cost (indefinido 2.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(33920);
  });

  it('computes correct pension reform employer cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(28267);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: High salary hitting AFP tope imponible (81.6 UF cap)
// ---------------------------------------------------------------------------
//
// baseSalary    = 4000000 (> 81.6 * 38500 = 3141600)
// gratification = round(min(1000000, 213354.17)) = 213354  [cap wins]
// totalImponible= 4000000 + 213354 = 4213354
// AFP cap = 81.6 * 38500 = 3141600
// AFP  (Habitat 1.27%, CAPPED) = round(3141600 * 0.0127) = 39898
// health (7%, NO CAP in engine) = round(4213354 * 0.07)  = 294935
// unem (0.6%)                   = round(4213354 * 0.006) = 25280
// incomeTaxBase = 4213354 - 39898 - 294935 - 25280 = 3853241
// 3853241 / 38500 = 100.0842 UF -> bracket [90,120) rate 30.4% deduction 17.8
// taxInUF = 100.0842 * 0.304 - 17.8 = 12.6256
// tax = round(12.6256 * 38500)          = 486085
// totalEarnings   = 4000000 + 213354 = 4213354
// totalDeductions = 39898 + 294935 + 25280 + 486085 = 846198
// netPay          = 4213354 - 846198   = 3367156
// SIS  (1.54%, CAPPED) = round(3141600 * 0.0154) = 48381
// mutual (0.93%)       = round(4213354 * 0.0093) = 39184
// empUnemployment      = round(4213354 * 0.024)  = 101120
// pensionReform (2%, CAPPED) = round(3141600 * 0.02) = 62832
// ---------------------------------------------------------------------------

describe('Scenario 3: High salary hitting AFP tope imponible (81.6 UF cap), AFP Habitat', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000003',
    baseSalary: 4000000,
    afpCode: 'habitat',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'legal',
    familyAllowanceLoads: 0,
  });

  it('computes gratification capped at 4.75 IMM/12 (salary well above cap)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(213354);
  });

  it('computes correct totalImponible', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(4213354);
  });

  it('applies 81.6 UF cap to AFP deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    // AFP is applied to min(4213354, 3141600) = 3141600
    expect(result.deductions.afp).toBe(39898);
  });

  it('does not cap health deduction — applied to full totalImponible', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    // Health rule has no 81.6 UF cap; applied to full 4213354
    expect(result.deductions.health).toBe(294935);
  });

  it('computes correct unemployment deduction (on full totalImponible)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(25280);
  });

  it('computes correct income tax (bracket 6: 30.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(486085);
  });

  it('computes correct net pay', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(3367156);
  });

  it('applies 81.6 UF cap to employer SIS cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(48381);
  });

  it('computes correct employer unemployment cost (no cap applied)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(101120);
  });

  it('applies 81.6 UF cap to pension reform employer cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(62832);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Isapre employee — 3.5 UF monthly plan, AFP Provida
// ---------------------------------------------------------------------------
//
// baseSalary    = 1500000
// gratification = round(min(375000, 213354.17)) = 213354
// totalImponible= 1500000 + 213354 = 1713354
// AFP  (Provida 1.45%) = round(1713354 * 0.0145) = 24844
// health (Isapre):
//   fonasa base  = round(1713354 * 0.07)   = 119935
//   isapre cost  = round(3.5 * 38500)      = 134750
//   health       = max(119935, 134750)     = 134750  [isapre cost wins]
// unem (0.6%)    = round(1713354 * 0.006)  = 10280
// incomeTaxBase  = 1713354 - 24844 - 134750 - 10280 = 1543480
// 1543480 / 38500 = 40.0904 UF -> bracket [30,50) rate 8% deduction 1.74
// taxInUF = 40.0904 * 0.08 - 1.74 = 1.46723
// tax = round(1.46723 * 38500)             = 56488
// totalEarnings   = 1500000 + 213354 = 1713354
// totalDeductions = 24844 + 134750 + 10280 + 56488 = 226362
// netPay          = 1713354 - 226362       = 1486992
// SIS  (1.54%)       = round(1713354 * 0.0154) = 26386
// mutual (0.93%)     = round(1713354 * 0.0093) = 15934
// empUnemployment    = round(1713354 * 0.024)  = 41120
// pensionReform (2%) = round(1713354 * 0.02)   = 34267
// ---------------------------------------------------------------------------

describe('Scenario 4: Isapre employee — 3.5 UF plan, AFP Provida', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000004',
    baseSalary: 1500000,
    afpCode: 'provida',
    healthPlan: 'isapre',
    isapreAmount: 3.5,
    contractType: 'indefinido',
    gratificationType: 'legal',
    familyAllowanceLoads: 0,
  });

  it('computes gratification capped at 4.75 IMM/12', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(213354);
  });

  it('uses Isapre cost (3.5 UF = 134750) because it exceeds 7% of imponible (119935)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(134750);
  });

  it('computes correct AFP deduction (Provida 1.45%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(24844);
  });

  it('computes correct unemployment deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(10280);
  });

  it('computes correct income tax (bracket 3: 8%, Isapre deduction reduces taxable base)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(56488);
  });

  it('computes correct net pay', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(1486992);
  });

  it('computes correct employer SIS cost (Provida 1.54%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(26386);
  });

  it('computes correct employer unemployment cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(41120);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Plazo fijo contract — AFP Uno, different employer unemployment rate
// ---------------------------------------------------------------------------
//
// baseSalary    = 800000
// gratification = round(min(800000 * 0.25, 213354.17))
//               = round(min(200000, 213354)) = 200000  [25% wins]
// totalImponible= 800000 + 200000 = 1000000
// AFP  (Uno 0.46%) = round(1000000 * 0.0046) = 4600
// health (7%)      = round(1000000 * 0.07)   = 70000
// unem (0.6%)      = round(1000000 * 0.006)  = 6000
// incomeTaxBase = 1000000 - 4600 - 70000 - 6000 = 919400
// 919400 / 38500 = 23.8805 UF -> bracket [13.5,30) rate 4% deduction 0.54
// taxInUF = 23.8805 * 0.04 - 0.54 = 0.41522
// tax = round(0.41522 * 38500)         = 15986
// totalEarnings   = 1000000
// totalDeductions = 4600 + 70000 + 6000 + 15986 = 96586
// netPay          = 1000000 - 96586     = 903414
// SIS  (1.54%)       = round(1000000 * 0.0154) = 15400
// mutual (0.93%)     = round(1000000 * 0.0093) = 9300
// empUnemployment (PLAZO_FIJO 3.0%) = round(1000000 * 0.03) = 30000
// pensionReform (2%) = round(1000000 * 0.02)  = 20000
// ---------------------------------------------------------------------------

describe('Scenario 5: Plazo fijo contract, AFP Uno — employer unemployment at 3%', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000005',
    baseSalary: 800000,
    afpCode: 'uno',
    healthPlan: 'fonasa',
    contractType: 'plazo_fijo',
    gratificationType: 'legal',
    familyAllowanceLoads: 0,
  });

  it('computes gratification via 25% rule (200000 < 213354 cap)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(200000);
  });

  it('computes correct totalImponible', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(1000000);
  });

  it('computes correct AFP deduction (Uno 0.46%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(4600);
  });

  it('computes correct health deduction (Fonasa 7%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(70000);
  });

  it('computes correct employee unemployment deduction (0.6% — unchanged by contract type)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(6000);
  });

  it('computes correct income tax', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(15986);
  });

  it('computes correct net pay', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(903414);
  });

  it('applies 3.0% employer unemployment rate (plazo_fijo, not 2.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(30000);
  });

  it('computes correct employer SIS cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(15400);
  });

  it('computes correct pension reform employer cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(20000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Convenida gratification (fixed monthly amount)
// ---------------------------------------------------------------------------
//
// baseSalary    = 900000
// gratification = 100000 (convenida — fixed amount, legal formula not applied)
// totalImponible= 900000 + 100000 = 1000000
// AFP  (Modelo 0.58%) = round(1000000 * 0.0058) = 5800
// health (7%)         = round(1000000 * 0.07)   = 70000
// unem (0.6%)         = round(1000000 * 0.006)  = 6000
// incomeTaxBase = 1000000 - 5800 - 70000 - 6000 = 918200
// 918200 / 38500 = 23.8494 UF -> bracket [13.5,30) rate 4% deduction 0.54
// taxInUF = 23.8494 * 0.04 - 0.54 = 0.41398
// tax = round(0.41398 * 38500)          = 15938
// totalEarnings   = 900000 + 100000 = 1000000
// totalDeductions = 5800 + 70000 + 6000 + 15938 = 97738
// netPay          = 1000000 - 97738      = 902262
// SIS  (1.54%)       = round(1000000 * 0.0154) = 15400
// mutual (0.93%)     = round(1000000 * 0.0093) = 9300
// empUnemployment    = round(1000000 * 0.024)  = 24000
// pensionReform (2%) = round(1000000 * 0.02)   = 20000
// ---------------------------------------------------------------------------

describe('Scenario 6: Convenida gratification — fixed 100000/month, AFP Modelo', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000006',
    baseSalary: 900000,
    afpCode: 'modelo',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'convenida',
    gratificationAmount: 100000,
    familyAllowanceLoads: 0,
  });

  it('uses the fixed convenida amount (ignores legal formula)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(100000);
  });

  it('computes correct totalImponible (base + convenida)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(1000000);
  });

  it('computes correct AFP deduction (Modelo 0.58%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(5800);
  });

  it('computes correct health deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(70000);
  });

  it('computes correct unemployment deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(6000);
  });

  it('computes correct income tax', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(15938);
  });

  it('computes correct net pay', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(902262);
  });

  it('computes correct employer unemployment cost (indefinido 2.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(24000);
  });

  it('computes correct employer SIS cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(15400);
  });

  it('computes correct pension reform employer cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(20000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Variable earnings — overtime (imponible + taxable) and
//             non-imponible, non-taxable bonus
// ---------------------------------------------------------------------------
//
// baseSalary    = 700000
// gratification = round(min(175000, 213354.17)) = 175000  [25% wins]
// overtime      = 150000  (isImponible: true, isTaxable: true)
// bonus         = 50000   (isImponible: false, isTaxable: false)
// totalImponible= 700000 + 175000 + 150000 = 1025000  [bonus excluded]
// totalTaxable  = 700000 + 175000 + 150000 = 1025000  [bonus excluded]
// AFP  (Capital 1.44%) = round(1025000 * 0.0144) = 14760
// health (7%)          = round(1025000 * 0.07)   = 71750
// unem (0.6%)          = round(1025000 * 0.006)  = 6150
// incomeTaxBase = 1025000 - 14760 - 71750 - 6150 = 932340
// 932340 / 38500 = 24.2166 UF -> bracket [13.5,30) rate 4% deduction 0.54
// taxInUF = 24.2166 * 0.04 - 0.54 = 0.42866
// tax = round(0.42866 * 38500)          = 16504
// totalEarnings: base(700000) + grat(175000) + overtime(150000) + bonus(50000) = 1075000
// totalDeductions = 14760 + 71750 + 6150 + 16504 = 109164
// netPay          = 1075000 - 109164     = 965836
// SIS  (1.54%)       = round(1025000 * 0.0154) = 15785
// mutual (0.93%)     = round(1025000 * 0.0093) = 9533
// empUnemployment    = round(1025000 * 0.024)  = 24600
// pensionReform (2%) = round(1025000 * 0.02)   = 20500
// ---------------------------------------------------------------------------

describe('Scenario 7: Variable earnings — overtime (imponible) + non-imponible bonus, AFP Capital', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000007',
    baseSalary: 700000,
    afpCode: 'capital',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'legal',
    familyAllowanceLoads: 0,
    earnings: [
      {
        type: 'overtime',
        description: 'Horas extra',
        amount: 150000,
        isImponible: true,
        isTaxable: true,
      },
      {
        type: 'bonus',
        description: 'Bono especial no imponible',
        amount: 50000,
        isImponible: false,
        isTaxable: false,
      },
    ],
  });

  it('computes gratification via 25% rule (175000 < 213354 cap)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(175000);
  });

  it('includes overtime in totalImponible, excludes non-imponible bonus', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.totalImponible).toBe(1025000);
  });

  it('categorizes overtime and bonus correctly in earnings breakdown', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.overtime).toBe(150000);
    expect(result.earnings.bonuses).toBe(50000);
  });

  it('computes AFP on imponible base including overtime', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(14760);
  });

  it('computes correct health deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(71750);
  });

  it('computes correct unemployment deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(6150);
  });

  it('computes correct income tax', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.incomeTax).toBe(16504);
  });

  it('includes non-imponible bonus in total earnings (employee receives it in liquid pay)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(965836);
  });

  it('computes correct employer SIS cost (on imponible base)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(15785);
  });

  it('computes correct employer unemployment cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(24600);
  });

  it('computes correct pension reform employer cost', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(20500);
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: APV voluntary savings reduce taxable income and income tax
// ---------------------------------------------------------------------------
//
// baseSalary    = 1000000
// gratification = round(min(250000, 213354.17)) = 213354  [cap wins]
// totalImponible= 1000000 + 213354 = 1213354
// AFP  (Habitat 1.27%) = round(1213354 * 0.0127) = 15410
// health (7%)          = round(1213354 * 0.07)   = 84935
// unem (0.6%)          = round(1213354 * 0.006)  = 7280
// APV              = 100000
// incomeTaxBase = 1213354 - 15410 - 84935 - 100000 - 7280 = 1005729
// 1005729 / 38500 = 26.1228 UF -> bracket [13.5,30) rate 4% deduction 0.54
// taxInUF = 26.1228 * 0.04 - 0.54 = 0.50491
// tax = round(0.50491 * 38500)         = 19439
// (without APV: taxBase=1105729 -> 28.7202 UF -> tax=23357; APV saves ~3918 CLP in tax)
// totalEarnings   = 1000000 + 213354 = 1213354
// totalDeductions = 15410 + 84935 + 7280 + 19439 + 100000 = 227064
// netPay          = 1213354 - 227064   = 986290
// SIS  (1.54%)       = round(1213354 * 0.0154) = 18686
// mutual (0.93%)     = round(1213354 * 0.0093) = 11284
// empUnemployment    = round(1213354 * 0.024)  = 29120
// pensionReform (2%) = round(1213354 * 0.02)   = 24267
// ---------------------------------------------------------------------------

describe('Scenario 8: APV voluntary savings (100000 CLP) reduce taxable income, AFP Habitat', () => {
  const employee = makeEmployee({
    employeeId: '00000000-0000-0000-0000-000000000008',
    baseSalary: 1000000,
    afpCode: 'habitat',
    healthPlan: 'fonasa',
    contractType: 'indefinido',
    gratificationType: 'legal',
    familyAllowanceLoads: 0,
    apvAmount: 100000,
  });

  it('computes gratification capped at 4.75 IMM/12', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.earnings.gratification).toBe(213354);
  });

  it('records APV deduction amount', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.apv).toBe(100000);
  });

  it('computes correct AFP deduction (Habitat 1.27%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.afp).toBe(15410);
  });

  it('computes correct health deduction (Fonasa 7%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.health).toBe(84935);
  });

  it('computes correct unemployment deduction', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.deductions.unemployment).toBe(7280);
  });

  it('computes lower income tax because APV reduces taxable base', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    // Without APV: incomeTaxBase=1105729 -> tax=23357
    // With APV:    incomeTaxBase=1005729 -> tax=19439 (savings of ~3918 CLP)
    expect(result.deductions.incomeTax).toBe(19439);
  });

  it('computes correct net pay (APV deducted from liquid pay)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.netPay).toBe(986290);
  });

  it('computes correct employer SIS cost (Habitat 1.54%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.sis).toBe(18686);
  });

  it('computes correct employer unemployment cost (indefinido 2.4%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.unemployment).toBe(29120);
  });

  it('computes correct pension reform employer cost (Phase 1: 2%)', () => {
    const result = calculateEmployeePayroll(employee, REF, PERIOD_DATE);
    expect(result.employerCosts.pensionReform).toBe(24267);
  });
});
