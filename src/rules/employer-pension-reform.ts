import { cappedPercentage } from '../money.js';

/**
 * Phase-in schedule for employer pension reform contributions
 * Law 21.720 - effective from August 2025
 */
const REFORM_PHASES: Array<{ startDate: Date; rate: number }> = [
  { startDate: new Date('2028-08-01'), rate: 8.5 },
  { startDate: new Date('2027-08-01'), rate: 6.0 },
  { startDate: new Date('2026-08-01'), rate: 4.0 },
  { startDate: new Date('2025-08-01'), rate: 2.0 },
];

/**
 * Get the employer pension reform rate for a given date.
 * Returns 0 if before reform start date (Aug 2025).
 */
export function getReformRate(effectiveDate: Date): number {
  for (const phase of REFORM_PHASES) {
    if (effectiveDate >= phase.startDate) {
      return phase.rate;
    }
  }
  return 0; // Before reform
}

/**
 * Calculate employer pension reform contribution.
 * This is an employer cost -- not deducted from the employee.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param uf - Current UF value in CLP
 * @param effectiveDate - Pay period date (determines which rate applies)
 * @returns Employer reform contribution in integer CLP
 */
export function calculateEmployerPensionReform(
  imponibleIncome: number,
  uf: number,
  effectiveDate: Date,
): number {
  const rate = getReformRate(effectiveDate);
  if (rate === 0) return 0;
  return cappedPercentage(imponibleIncome, uf, rate);
}
