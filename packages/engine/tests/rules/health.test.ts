import { describe, expect, it } from 'vitest';
import { calculateHealth } from '../../src/rules/health.js';

const UF = 38500;

describe('Health Insurance Calculation', () => {
  it('should calculate Fonasa deduction (7%)', () => {
    const result = calculateHealth(1_000_000, 'fonasa', 0, UF);
    expect(result).toBe(70000);
  });

  it('should calculate Isapre deduction with total plan cost in UF', () => {
    // Plan costs 3 UF total = 115,500. 7% = 70,000. max(70,000, 115,500) = 115,500
    const result = calculateHealth(1_000_000, 'isapre', 3, UF);
    expect(result).toBe(115500);
  });

  it('should deduct full Isapre plan cost when it exceeds 7%', () => {
    // Employee: $1,650,000 imponible, plan costs 6.55 UF
    // 7% = 115,500. Plan = 6.55 * 38,500 = 252,175
    // max(115,500, 252,175) = 252,175 (full plan cost deducted)
    const result = calculateHealth(1_650_000, 'isapre', 6.55, UF);
    expect(result).toBe(252175);
    // This full amount reduces the income tax base
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
