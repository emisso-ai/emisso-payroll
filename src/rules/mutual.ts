/**
 * Mutual de Seguridad (work accident insurance) calculation rules
 *
 * Employer cost based on company's risk rate applied to imponible income.
 */

import { percentage } from '../money.js';

/**
 * Calculate mutual employer cost.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param mutualRate - Company mutual rate as percentage (e.g. 0.93)
 * @returns Mutual cost in integer CLP
 */
export function calculateMutual(imponibleIncome: number, mutualRate: number): number {
  return percentage(imponibleIncome, mutualRate);
}
