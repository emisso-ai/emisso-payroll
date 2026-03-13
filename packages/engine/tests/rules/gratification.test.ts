import { describe, expect, it } from 'vitest';
import { calculateGratification } from '../../src/rules/gratification.js';

const IMM = 539000;

describe('Gratification Calculation', () => {
  it('should calculate legal gratification', () => {
    const result = calculateGratification(1_000_000, 'legal', 0, IMM);
    expect(result).toBe(213354);
  });

  it('should use convenida amount when specified', () => {
    const result = calculateGratification(1_000_000, 'convenida', 150000, IMM);
    expect(result).toBe(150000);
  });

  it('should return 0 for no gratification', () => {
    const result = calculateGratification(1_000_000, 'none', 0, IMM);
    expect(result).toBe(0);
  });

  it('should cap legal gratification at 4.75 IMM / 12', () => {
    const result = calculateGratification(5_000_000, 'legal', 0, IMM);
    expect(result).toBe(213354);
  });

  it('should use 25% when salary is low enough', () => {
    const result = calculateGratification(539_000, 'legal', 0, IMM);
    expect(result).toBe(134750);
  });
});
