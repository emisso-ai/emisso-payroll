/**
 * Family allowance (Asignacion Familiar) calculation rules
 *
 * Amount per load based on income bracket.
 * Tax-exempt government benefit.
 */

import { roundCLP } from '../money.js';

/**
 * Calculate family allowance.
 *
 * @param baseSalary - Monthly base salary in CLP (used to find bracket)
 * @param loads - Number of family dependents
 * @param brackets - Family allowance brackets with from/to/amount
 * @returns Total family allowance in integer CLP
 */
export function calculateFamilyAllowance(
  baseSalary: number,
  loads: number,
  brackets: Array<{ from: number; to: number | null; amount: number }>
): number {
  if (loads <= 0) {
    return 0;
  }

  const bracket = brackets.find((b) => {
    const aboveFrom = baseSalary >= b.from;
    const belowTo = b.to === null || baseSalary <= b.to;
    return aboveFrom && belowTo;
  });

  if (!bracket) {
    return 0;
  }

  return roundCLP(bracket.amount * loads);
}
