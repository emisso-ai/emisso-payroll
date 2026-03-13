/**
 * Money utilities for Chilean Peso (CLP)
 *
 * IMPORTANT: CLP has no decimal places. All amounts are integers.
 * All calculations should preserve integer arithmetic.
 */

/**
 * Round a number to integer (CLP doesn't use decimals)
 * Uses banker's rounding (round half to even) for fairness
 */
export function roundCLP(amount: number): number {
  return Math.round(amount);
}

/**
 * Calculate percentage of an amount with precise rounding
 * @param amount - Base amount in CLP
 * @param rate - Percentage rate (e.g., 10.5 for 10.5%)
 * @returns Calculated percentage as integer
 */
export function percentage(amount: number, rate: number): number {
  return roundCLP((amount * rate) / 100);
}

/**
 * Constrain a value between minimum and maximum bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Add multiple amounts safely (maintains integer arithmetic)
 */
export function sum(...amounts: number[]): number {
  return amounts.reduce((acc, val) => acc + roundCLP(val), 0);
}

/**
 * Subtract amounts safely (maintains integer arithmetic)
 */
export function subtract(a: number, b: number): number {
  return roundCLP(a) - roundCLP(b);
}

/**
 * Multiply amount by a factor and round to integer
 */
export function multiply(amount: number, factor: number): number {
  return roundCLP(amount * factor);
}

/**
 * Divide amount by a divisor and round to integer
 */
export function divide(amount: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error('División por cero');
  }
  return roundCLP(amount / divisor);
}

/**
 * Format CLP amount for display with thousands separator
 * @returns Formatted string like "1.234.567"
 */
export function formatCLP(amount: number): string {
  return roundCLP(amount).toLocaleString('es-CL');
}

/**
 * AFP/SIS/Pension Reform cap in UF (tope imponible)
 */
export const AFP_CAP_UF = 81.6;

/**
 * Apply percentage to an amount capped at the AFP tope imponible (81.6 UF).
 * Used by AFP, SIS, and pension reform calculations.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param uf - Current UF value in CLP
 * @param rate - Percentage rate to apply
 * @returns Calculated amount in integer CLP
 */
export function cappedPercentage(imponibleIncome: number, uf: number, rate: number): number {
  const cap = roundCLP(AFP_CAP_UF * uf);
  const base = Math.min(imponibleIncome, cap);
  return percentage(base, rate);
}
