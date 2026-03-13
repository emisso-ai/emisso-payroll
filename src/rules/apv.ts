/**
 * APV (Ahorro Previsional Voluntario) calculation rules
 *
 * Voluntary pension savings deducted from taxable income.
 * The amount is already specified in CLP by the employee.
 */

import { roundCLP } from '../money.js';

/**
 * Calculate APV deduction.
 *
 * @param apvAmount - Voluntary savings amount in CLP
 * @returns APV deduction in integer CLP
 */
export function calculateAPV(apvAmount: number): number {
  return roundCLP(apvAmount);
}
