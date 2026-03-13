/**
 * Overtime calculation rules
 *
 * Chilean overtime: hourly rate = (baseSalary / 45 / 4.33) * 1.5 (50% surcharge)
 * 45 = weekly hours, 4.33 = average weeks per month
 */

import { roundCLP } from '../money.js';

const WEEKLY_HOURS = 45;
const WEEKS_PER_MONTH = 4.33;
const OVERTIME_SURCHARGE = 1.5;

/**
 * Calculate overtime pay.
 *
 * @param hours - Number of overtime hours worked
 * @param baseSalary - Monthly base salary in CLP
 * @returns Overtime pay in integer CLP
 */
export function calculateOvertime(hours: number, baseSalary: number): number {
  if (hours <= 0) {
    return 0;
  }

  const hourlyRate = baseSalary / WEEKLY_HOURS / WEEKS_PER_MONTH;
  const overtimeRate = hourlyRate * OVERTIME_SURCHARGE;

  return roundCLP(hours * overtimeRate);
}
