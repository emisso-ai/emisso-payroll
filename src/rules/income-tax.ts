/**
 * Income tax (Impuesto Unico de Segunda Categoria) calculation rules
 *
 * Progressive tax brackets denominated in UF.
 * Applied to taxable income after AFP, health, APV, and unemployment deductions.
 */

import { roundCLP } from '../money.js';

/**
 * Calculate income tax (Impuesto Unico).
 *
 * @param taxableIncome - Taxable income in CLP (after social security deductions)
 * @param taxBrackets - Tax brackets with from/to in UF, rate in %, deduction in UF
 * @param ufValue - Current UF value in CLP
 * @returns Income tax in integer CLP
 */
export function calculateIncomeTax(
  taxableIncome: number,
  taxBrackets: Array<{ from: number; to: number | null; rate: number; deduction: number }>,
  ufValue: number
): number {
  if (taxableIncome <= 0) {
    return 0;
  }

  const taxableInUF = taxableIncome / ufValue;

  // Find the bracket where taxableInUF falls
  const bracket = taxBrackets.find((b) => {
    const aboveFrom = taxableInUF >= b.from;
    const belowTo = b.to === null || taxableInUF < b.to;
    return aboveFrom && belowTo;
  });

  if (!bracket || bracket.rate === 0) {
    return 0;
  }

  // Tax = (taxableInUF * rate/100 - deduction) * uf
  const taxInUF = taxableInUF * (bracket.rate / 100) - bracket.deduction;

  if (taxInUF <= 0) {
    return 0;
  }

  return roundCLP(taxInUF * ufValue);
}
