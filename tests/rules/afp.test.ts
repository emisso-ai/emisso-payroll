import { describe, expect, it } from 'vitest';
import { calculateAFP } from '../../src/rules/afp.js';

const UF = 38500;

const afpRates: Record<string, { commissionRate: number; sisRate: number }> = {
  capital: { commissionRate: 1.44, sisRate: 1.54 },
  habitat: { commissionRate: 1.27, sisRate: 1.54 },
  modelo:  { commissionRate: 0.58, sisRate: 1.54 },
};

describe('AFP Calculation', () => {
  it('should calculate AFP deduction correctly', () => {
    const result = calculateAFP(1_000_000, 'capital', afpRates, UF);
    expect(result).toBe(14400);
  });

  it('should respect 81.6 UF cap', () => {
    const result = calculateAFP(4_000_000, 'capital', afpRates, UF);
    expect(result).toBe(45239);
  });

  it('should use correct commission rate by provider', () => {
    const habitat = calculateAFP(1_000_000, 'habitat', afpRates, UF);
    expect(habitat).toBe(12700);

    const modelo = calculateAFP(1_000_000, 'modelo', afpRates, UF);
    expect(modelo).toBe(5800);
  });

  it('should throw for unknown AFP provider', () => {
    expect(() => calculateAFP(1_000_000, 'unknown', afpRates, UF)).toThrow(
      'AFP provider not found: unknown'
    );
  });

  it('should handle income exactly at cap', () => {
    const result = calculateAFP(3_141_600, 'capital', afpRates, UF);
    expect(result).toBe(45239);
  });
});
