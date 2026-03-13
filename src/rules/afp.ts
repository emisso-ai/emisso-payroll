/**
 * AFP (Pension Fund) calculation rules
 *
 * Calculates the employee AFP deduction based on imponible income,
 * the AFP provider's commission rate, and the 81.6 UF cap.
 */

import { cappedPercentage } from '../money.js';

/**
 * Calculate AFP pension fund deduction for an employee.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param afpCode - AFP provider code (e.g. 'capital', 'habitat')
 * @param afpRates - Map of AFP codes to their commission and SIS rates
 * @param uf - Current UF value in CLP
 * @returns AFP deduction amount in integer CLP
 */
export function calculateAFP(
  imponibleIncome: number,
  afpCode: string,
  afpRates: Record<string, { commissionRate: number; sisRate: number }>,
  uf: number
): number {
  const rates = afpRates[afpCode];
  if (!rates) {
    throw new Error(`AFP provider not found: ${afpCode}`);
  }

  return cappedPercentage(imponibleIncome, uf, rates.commissionRate);
}
