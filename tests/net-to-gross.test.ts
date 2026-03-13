import { describe, it, expect } from 'vitest';
import { solveNetToGross } from '../src/net-to-gross.js';
import { calculateEmployeePayroll } from '../src/calculator.js';
import type { ReferenceData } from '../src/types.js';

const referenceData: ReferenceData = {
  uf: 38500,
  utm: 65967,
  uta: 791604,
  imm: 539000,
  afpRates: {
    capital: { commissionRate: 1.44, sisRate: 1.54 },
    cuprum: { commissionRate: 1.44, sisRate: 1.54 },
    habitat: { commissionRate: 1.27, sisRate: 1.54 },
    planvital: { commissionRate: 1.16, sisRate: 1.54 },
    provida: { commissionRate: 1.45, sisRate: 1.54 },
    modelo: { commissionRate: 0.58, sisRate: 1.54 },
    uno: { commissionRate: 0.49, sisRate: 1.54 },
  },
  fonasaRate: 7,
  taxBrackets: [
    { from: 0, to: 13.5, rate: 0, deduction: 0 },
    { from: 13.5, to: 30, rate: 4, deduction: 0.54 },
    { from: 30, to: 50, rate: 8, deduction: 1.74 },
    { from: 50, to: 70, rate: 13.5, deduction: 4.49 },
    { from: 70, to: 90, rate: 23, deduction: 11.14 },
    { from: 90, to: 120, rate: 30.4, deduction: 17.8 },
    { from: 120, to: 310, rate: 35.5, deduction: 23.92 },
    { from: 310, to: null, rate: 40, deduction: 37.87 },
  ],
  familyAllowanceBrackets: [
    { from: 0, to: 481698, amount: 14872 },
    { from: 481698, to: 703347, amount: 9108 },
    { from: 703347, to: 1093554, amount: 2876 },
    { from: 1093554, to: null, amount: 0 },
  ],
  unemploymentRate: 0.6,
  mutualRate: 0.93,
};

/** Standard input template for tests */
function makeInput(targetNetPay: number) {
  return {
    rut: '12.345.678-5',
    firstName: 'Juan',
    lastName: 'Perez',
    targetNetPay,
    gratificationType: 'legal' as const,
    colacion: 0,
    movilizacion: 0,
    afpCode: 'capital',
    afpFund: 'b' as const,
    healthPlan: 'fonasa' as const,
    familyAllowanceLoads: 0,
    contractType: 'indefinido' as const,
    earnings: [],
    deductions: [],
  };
}

describe('solveNetToGross', () => {
  it('should converge for a typical net pay of 800,000 CLP', () => {
    const result = solveNetToGross(makeInput(800000), referenceData);

    expect(result.converged).toBe(true);
    expect(Math.abs(result.actualNetPay - 800000)).toBeLessThanOrEqual(1);
    expect(result.grossSalary).toBeGreaterThan(0);
    expect(result.targetNetPay).toBe(800000);
  });

  it('should converge for a net pay near minimum wage (IMM = 539,000)', () => {
    const result = solveNetToGross(makeInput(620000), referenceData);

    expect(result.converged).toBe(true);
    expect(Math.abs(result.actualNetPay - 620000)).toBeLessThanOrEqual(1);
  });

  it('should converge for a high net pay of 3,000,000 CLP', () => {
    const result = solveNetToGross(makeInput(3000000), referenceData);

    expect(result.converged).toBe(true);
    expect(Math.abs(result.actualNetPay - 3000000)).toBeLessThanOrEqual(1);
    expect(result.grossSalary).toBeGreaterThan(3000000);
  });

  it('should converge in at most 50 iterations for all salary ranges', () => {
    const targets = [620000, 800000, 1200000, 2000000, 3000000, 5000000];

    for (const target of targets) {
      const result = solveNetToGross(makeInput(target), referenceData);
      expect(result.iterations).toBeLessThanOrEqual(50);
      expect(result.converged).toBe(true);
    }
  });

  it('should produce a roundtrip: gross-to-net of the found gross equals target', () => {
    const target = 1000000;
    const solverResult = solveNetToGross(makeInput(target), referenceData);

    expect(solverResult.converged).toBe(true);

    const forwardResult = calculateEmployeePayroll(
      {
        employeeId: 'roundtrip-test',
        rut: '12.345.678-5',
        firstName: 'Juan',
        lastName: 'Perez',
        baseSalary: solverResult.grossSalary,
        gratificationType: 'legal',
        colacion: 0,
        movilizacion: 0,
        afpCode: 'capital',
        afpFund: 'b',
        healthPlan: 'fonasa',
        familyAllowanceLoads: 0,
        contractType: 'indefinido',
        earnings: [],
        deductions: [],
      },
      referenceData
    );

    expect(Math.abs(forwardResult.netPay - target)).toBeLessThanOrEqual(1);
  });

  it('should include a full breakdown in the result', () => {
    const result = solveNetToGross(makeInput(800000), referenceData);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.earnings.baseSalary).toBe(result.grossSalary);
    expect(result.breakdown.deductions.afp).toBeGreaterThan(0);
    expect(result.breakdown.deductions.health).toBeGreaterThan(0);
    expect(result.breakdown.netPay).toBe(result.actualNetPay);
  });

  it('should handle non-zero colacion and movilizacion', () => {
    const input = {
      ...makeInput(850000),
      colacion: 50000,
      movilizacion: 30000,
    };

    const result = solveNetToGross(input, referenceData);

    expect(result.converged).toBe(true);
    expect(Math.abs(result.actualNetPay - 850000)).toBeLessThanOrEqual(1);
  });

  it('should handle isapre health plan', () => {
    const input = {
      ...makeInput(800000),
      healthPlan: 'isapre' as const,
      isapreAmount: 3.5,
    };

    const result = solveNetToGross(input, referenceData);

    expect(result.converged).toBe(true);
    expect(Math.abs(result.actualNetPay - 800000)).toBeLessThanOrEqual(1);
  });

  it('should handle custom solver options', () => {
    const result = solveNetToGross(
      makeInput(800000),
      referenceData,
      {
        tolerance: 0,
        maxIterations: 100,
        minGross: 100000,
        maxGross: 20000000,
      }
    );

    expect(result.iterations).toBeGreaterThan(0);
    expect(result.grossSalary).toBeGreaterThan(0);
  });

  it('should work with different AFP providers', () => {
    const providers = ['capital', 'habitat', 'modelo', 'uno'] as const;

    for (const afpCode of providers) {
      const input = { ...makeInput(800000), afpCode };
      const result = solveNetToGross(input, referenceData);

      expect(result.converged).toBe(true);
      expect(Math.abs(result.actualNetPay - 800000)).toBeLessThanOrEqual(1);
    }
  });
});
