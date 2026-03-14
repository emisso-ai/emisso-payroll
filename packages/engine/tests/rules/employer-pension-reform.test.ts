import { describe, expect, it } from 'vitest';
import { calculateEmployerPensionReform, getReformRate } from '../../src/rules/employer-pension-reform.js';

const UF = 38500;

describe('Employer Pension Reform', () => {
  describe('getReformRate', () => {
    it('should return 0 before Aug 2025', () => {
      expect(getReformRate(new Date('2025-07-31'))).toBe(0);
      expect(getReformRate(new Date('2020-01-01'))).toBe(0);
    });

    it('should return 2.0% from Aug 2025', () => {
      expect(getReformRate(new Date('2025-08-01'))).toBe(2.0);
      expect(getReformRate(new Date('2026-07-31'))).toBe(2.0);
    });

    it('should return 4.0% from Aug 2026', () => {
      expect(getReformRate(new Date('2026-08-01'))).toBe(4.0);
      expect(getReformRate(new Date('2027-07-31'))).toBe(4.0);
    });

    it('should return 6.0% from Aug 2027', () => {
      expect(getReformRate(new Date('2027-08-01'))).toBe(6.0);
      expect(getReformRate(new Date('2028-07-31'))).toBe(6.0);
    });

    it('should return 8.5% from Aug 2028 (steady state)', () => {
      expect(getReformRate(new Date('2028-08-01'))).toBe(8.5);
      expect(getReformRate(new Date('2030-01-01'))).toBe(8.5);
    });
  });

  describe('calculateEmployerPensionReform', () => {
    it('should return 0 before reform start', () => {
      expect(calculateEmployerPensionReform(1_000_000, UF, new Date('2025-07-31'))).toBe(0);
    });

    it('should calculate 2% on salary within cap (Phase 1: Aug 2025)', () => {
      expect(calculateEmployerPensionReform(1_000_000, UF, new Date('2025-08-01'))).toBe(20_000);
    });

    it('should calculate 4% on salary (Phase 2: Aug 2026)', () => {
      expect(calculateEmployerPensionReform(1_000_000, UF, new Date('2026-08-01'))).toBe(40_000);
    });

    it('should calculate 6% on salary (Phase 3: Aug 2027)', () => {
      expect(calculateEmployerPensionReform(1_000_000, UF, new Date('2027-08-01'))).toBe(60_000);
    });

    it('should calculate 8.5% on salary (Phase 4: Aug 2028)', () => {
      expect(calculateEmployerPensionReform(1_000_000, UF, new Date('2028-08-01'))).toBe(85_000);
    });

    it('should cap at 81.6 UF', () => {
      const cap = Math.round(81.6 * UF);
      const overCap = cap + 1_000_000;
      const expected = Math.round(cap * 2.0 / 100);
      expect(calculateEmployerPensionReform(overCap, UF, new Date('2025-08-01'))).toBe(expected);
    });

    it('should calculate correctly for 2026 (current year)', () => {
      const result = calculateEmployerPensionReform(1_500_000, UF, new Date('2026-02-17'));
      expect(result).toBe(30_000);
    });
  });
});
