import { describe, it, expect } from 'vitest';
import { generatePreviredFile } from '../../src/previred/index.js';
import { validatePreviredData } from '../../src/previred/validator.js';
import type { PreviredFileData } from '../../src/previred/types.js';

const baseEmployee = {
  rut: '12345678',
  rutDv: '9',
  firstName: 'Juan Carlos',
  firstLastName: 'Pérez',
  secondLastName: 'González',
  daysWorked: 30,
  baseSalary: 1_000_000,
  gratification: 213_354,
  extraHours: 0,
  otherImponible: 0,
  nonTaxableAllowances: 80_000,
  totalImponibleAfp: 1_213_354,
  afpCode: '03',       // Capital
  afpWorkerAmount: 17_472,
  apvAmount: 0,
  sisAmount: 18_686,
  totalImponibleHealth: 1_213_354,
  healthCode: '07',    // FONASA
  healthWorkerAmount: 84_935,
  unemploymentWorker: 7_280,
  unemploymentEmployer: 29_120,
  totalTaxable: 1_213_354,
  incomeTax: 17_819,
  mutualAmount: 11_284,
  pensionReform: 24_267,
  netPay: 1_000_000 + 213_354 + 80_000 - 17_472 - 84_935 - 7_280 - 17_819,
};

const baseFile: PreviredFileData = {
  company: {
    rut: '76123456',
    rutDv: '7',
    businessName: 'Empresa Test SpA',
    periodYear: 2026,
    periodMonth: 2,
  },
  employees: [baseEmployee],
};

describe('generatePreviredFile', () => {
  it('should generate a non-empty string', () => {
    const output = generatePreviredFile(baseFile);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('should produce one line per employee', () => {
    const output = generatePreviredFile(baseFile);
    const lines = output.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('should produce correct number of lines for multiple employees', () => {
    const twoEmployees: PreviredFileData = {
      ...baseFile,
      employees: [baseEmployee, { ...baseEmployee, rut: '98765432', rutDv: 'K' }],
    };
    const output = generatePreviredFile(twoEmployees);
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
  });

  it('should start each record with "01" (record type)', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    expect(firstLine.slice(0, 2)).toBe('01');
  });

  it('should include period YYYYMM at correct position', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const period = firstLine.slice(80, 86);
    expect(period).toBe('202602');
  });

  it('should right-align RUT with zero padding', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const rut = firstLine.slice(2, 11);
    expect(rut).toBe('012345678');
  });

  it('should left-align first last name with space padding', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const lastName = firstLine.slice(12, 36);
    expect(lastName).toHaveLength(24);
    expect(lastName.trimEnd()).toBe('Pérez');
  });

  it('should format days worked as 2-digit zero-padded', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const days = firstLine.slice(86, 88);
    expect(days).toBe('30');
  });

  it('should format baseSalary as 11-digit zero-padded', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const salary = firstLine.slice(88, 99);
    expect(salary).toBe('00001000000');
  });

  it('should include AFP code at correct position', () => {
    const output = generatePreviredFile(baseFile);
    const firstLine = output.split('\n')[0]!;
    const afpCode = firstLine.slice(154, 157);
    expect(afpCode).toBe('03 ');
  });

  it('should return empty string for no employees', () => {
    const emptyFile: PreviredFileData = { ...baseFile, employees: [] };
    const output = generatePreviredFile(emptyFile);
    expect(output).toBe('');
  });
});

describe('validatePreviredData', () => {
  it('should return valid for correct data', () => {
    const result = validatePreviredData(baseFile);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should flag invalid AFP code', () => {
    const bad: PreviredFileData = {
      ...baseFile,
      employees: [{ ...baseEmployee, afpCode: '99' }],
    };
    const result = validatePreviredData(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('afpCode'))).toBe(true);
  });

  it('should flag negative net pay', () => {
    const bad: PreviredFileData = {
      ...baseFile,
      employees: [{ ...baseEmployee, netPay: -1 }],
    };
    const result = validatePreviredData(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('netPay'))).toBe(true);
  });

  it('should flag days worked > 30', () => {
    const bad: PreviredFileData = {
      ...baseFile,
      employees: [{ ...baseEmployee, daysWorked: 31 }],
    };
    const result = validatePreviredData(bad);
    expect(result.valid).toBe(false);
  });

  it('should flag invalid health code', () => {
    const bad: PreviredFileData = {
      ...baseFile,
      employees: [{ ...baseEmployee, healthCode: '99' }],
    };
    const result = validatePreviredData(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('healthCode'))).toBe(true);
  });

  it('should report multiple errors', () => {
    const bad: PreviredFileData = {
      ...baseFile,
      employees: [{ ...baseEmployee, afpCode: '99', healthCode: '99', daysWorked: 31 }],
    };
    const result = validatePreviredData(bad);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
