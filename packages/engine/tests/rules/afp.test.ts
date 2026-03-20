import { describe, expect, it } from 'vitest';
import { calculateAFP } from '../../src/rules/afp.js';

const UF = 38500;

const afpRates: Record<string, { commissionRate: number; sisRate: number }> = {
  capital: { commissionRate: 1.44, sisRate: 1.54 },
  habitat: { commissionRate: 1.27, sisRate: 1.54 },
  modelo:  { commissionRate: 0.58, sisRate: 1.54 },
};

describe('AFP Calculation', () => {
  it('should include mandatory 10% plus commission rate', () => {
    // capital: 10% + 1.44% = 11.44%
    const result = calculateAFP(1_000_000, 'capital', afpRates, UF);
    expect(result).toBe(114400);
  });

  it('should respect 81.6 UF cap', () => {
    // cap = 81.6 * 38500 = 3,141,600
    // capital: 3,141,600 * 11.44% = 359,399
    const result = calculateAFP(4_000_000, 'capital', afpRates, UF);
    expect(result).toBe(359399);
  });

  it('should use correct commission rate by provider', () => {
    // habitat: 10% + 1.27% = 11.27% → 1,000,000 * 11.27% = 112,700
    const habitat = calculateAFP(1_000_000, 'habitat', afpRates, UF);
    expect(habitat).toBe(112700);

    // modelo: 10% + 0.58% = 10.58% → 1,000,000 * 10.58% = 105,800
    const modelo = calculateAFP(1_000_000, 'modelo', afpRates, UF);
    expect(modelo).toBe(105800);
  });

  it('should throw for unknown AFP provider', () => {
    expect(() => calculateAFP(1_000_000, 'unknown', afpRates, UF)).toThrow(
      'AFP provider not found: unknown'
    );
  });

  it('should handle income exactly at cap', () => {
    // 3,141,600 is exactly 81.6 UF → capital 11.44% = 359,399
    const result = calculateAFP(3_141_600, 'capital', afpRates, UF);
    expect(result).toBe(359399);
  });
});
