import { describe, expect, it } from 'vitest';
import { calculateFamilyAllowance } from '../../src/rules/family-allowance.js';

const brackets = [
  { from: 0,       to: 539000,   amount: 18832 },  // Tramo A
  { from: 539001,  to: 787000,   amount: 11554 },  // Tramo B
  { from: 787001,  to: 1226759,  amount: 3651 },   // Tramo C
  { from: 1226760, to: null,     amount: 0 },       // No allowance
];

describe('Family Allowance Calculation', () => {
  it('should calculate allowance for tramo A', () => {
    const result = calculateFamilyAllowance(400_000, 1, brackets);
    expect(result).toBe(18832);
  });

  it('should calculate allowance for tramo B', () => {
    const result = calculateFamilyAllowance(600_000, 1, brackets);
    expect(result).toBe(11554);
  });

  it('should calculate allowance for tramo C', () => {
    const result = calculateFamilyAllowance(1_000_000, 1, brackets);
    expect(result).toBe(3651);
  });

  it('should return 0 for high income', () => {
    const result = calculateFamilyAllowance(1_500_000, 2, brackets);
    expect(result).toBe(0);
  });

  it('should multiply by number of loads', () => {
    const result = calculateFamilyAllowance(400_000, 3, brackets);
    expect(result).toBe(18832 * 3);
  });

  it('should return 0 when no loads', () => {
    const result = calculateFamilyAllowance(400_000, 0, brackets);
    expect(result).toBe(0);
  });
});
