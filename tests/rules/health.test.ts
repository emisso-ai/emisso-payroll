import { describe, expect, it } from 'vitest';
import { calculateHealth } from '../../src/rules/health.js';

const UF = 38500;

describe('Health Insurance Calculation', () => {
  it('should calculate Fonasa deduction (7%)', () => {
    const result = calculateHealth(1_000_000, 'fonasa', 0, UF);
    expect(result).toBe(70000);
  });

  it('should calculate Isapre deduction with additional UF', () => {
    const result = calculateHealth(1_000_000, 'isapre', 3, UF);
    expect(result).toBe(115500);
  });

  it('should calculate on imponible income', () => {
    const result = calculateHealth(2_500_000, 'fonasa', 0, UF);
    expect(result).toBe(175000);
  });

  it('should use 7% minimum for Isapre when plan is cheaper', () => {
    const result = calculateHealth(1_000_000, 'isapre', 1, UF);
    expect(result).toBe(70000);
  });
});
