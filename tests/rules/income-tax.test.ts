import { describe, expect, it } from 'vitest';
import { calculateIncomeTax } from '../../src/rules/income-tax.js';

const UF = 38500;

const taxBrackets = [
  { from: 0,    to: 13.5,  rate: 0,    deduction: 0 },
  { from: 13.5, to: 30,    rate: 4,    deduction: 0.54 },
  { from: 30,   to: 50,    rate: 8,    deduction: 1.74 },
  { from: 50,   to: 70,    rate: 13.5, deduction: 4.49 },
  { from: 70,   to: 90,    rate: 23,   deduction: 11.14 },
  { from: 90,   to: 120,   rate: 30.4, deduction: 17.8 },
  { from: 120,  to: 310,   rate: 35.5, deduction: 23.92 },
  { from: 310,  to: null,  rate: 40,   deduction: 37.87 },
];

describe('Income Tax Calculation', () => {
  it('should calculate tax for first bracket (exempt)', () => {
    const result = calculateIncomeTax(400_000, taxBrackets, UF);
    expect(result).toBe(0);
  });

  it('should calculate tax for second bracket (4%)', () => {
    const result = calculateIncomeTax(770_000, taxBrackets, UF);
    expect(result).toBe(10010);
  });

  it('should handle tax-exempt income', () => {
    const result = calculateIncomeTax(0, taxBrackets, UF);
    expect(result).toBe(0);
  });

  it('should handle negative income', () => {
    const result = calculateIncomeTax(-100_000, taxBrackets, UF);
    expect(result).toBe(0);
  });

  it('should apply progressive rates correctly', () => {
    const result = calculateIncomeTax(1_540_000, taxBrackets, UF);
    expect(result).toBe(56210);
  });

  it('should calculate tax for high income bracket', () => {
    const result = calculateIncomeTax(3_850_000, taxBrackets, UF);
    expect(result).toBe(485100);
  });
});
