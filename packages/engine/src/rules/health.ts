/**
 * Health insurance calculation rules
 *
 * - Fonasa: 7% of imponible income
 * - Isapre: max(7% of imponible, isapreUFAmount * uf)
 */

import { percentage, roundCLP } from '../money.js';

const FONASA_RATE = 7;

/**
 * Calculate health insurance deduction.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param healthPlan - 'fonasa' or 'isapre'
 * @param isapreUFAmount - Isapre plan cost in UF (only used for isapre)
 * @param ufValue - Current UF value in CLP
 * @returns Health deduction in integer CLP
 */
export function calculateHealth(
  imponibleIncome: number,
  healthPlan: 'fonasa' | 'isapre',
  isapreUFAmount: number,
  ufValue: number
): number {
  const minimumHealth = percentage(imponibleIncome, FONASA_RATE);

  if (healthPlan === 'fonasa') {
    return minimumHealth;
  }

  // Isapre: the greater of 7% or the plan cost in UF
  const isapreCost = roundCLP(isapreUFAmount * ufValue);
  return Math.max(minimumHealth, isapreCost);
}
