import { describe, expect, it } from 'vitest';
import { calculateUnemployment } from '../../src/rules/unemployment.js';

describe('Unemployment Insurance Calculation', () => {
  it('should calculate employee portion (0.6%)', () => {
    const result = calculateUnemployment(1_000_000, 'indefinido');
    expect(result.employee).toBe(6000);
  });

  it('should calculate employer portion for indefinido (2.4%)', () => {
    const result = calculateUnemployment(1_000_000, 'indefinido');
    expect(result.employer).toBe(24000);
  });

  it('should calculate employer portion for plazo_fijo (3%)', () => {
    const result = calculateUnemployment(1_000_000, 'plazo_fijo');
    expect(result.employer).toBe(30000);
  });

  it('should calculate employer portion for por_obra (3%)', () => {
    const result = calculateUnemployment(1_000_000, 'por_obra');
    expect(result.employer).toBe(30000);
  });

  it('should calculate both portions together', () => {
    const result = calculateUnemployment(2_000_000, 'indefinido');
    expect(result.employee).toBe(12000);
    expect(result.employer).toBe(48000);
  });
});
