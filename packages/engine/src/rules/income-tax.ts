/**
 * Income tax (Impuesto Unico de Segunda Categoria) calculation rules
 *
 * Progressive tax brackets denominated in UTM (Unidad Tributaria Mensual).
 * Applied to taxable income after AFP, health, APV, and unemployment deductions.
 *
 * @see https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2020.htm
 */

import { roundCLP } from '../money.js';

/**
 * Calculate income tax (Impuesto Unico).
 *
 * @param taxableIncome - Taxable income in CLP (after social security deductions)
 * @param taxBrackets - Tax brackets with from/to in UTM, rate in %, deduction in UTM
 * @param utmValue - Current UTM value in CLP
 * @returns Income tax in integer CLP
 */
export function calculateIncomeTax(
  taxableIncome: number,
  taxBrackets: Array<{ from: number; to: number | null; rate: number; deduction: number }>,
  utmValue: number
): number {
  if (taxableIncome <= 0) {
    return 0;
  }

  const taxableInUTM = taxableIncome / utmValue;

  // Find the bracket where taxableInUTM falls
  const bracket = taxBrackets.find((b) => {
    const aboveFrom = taxableInUTM >= b.from;
    const belowTo = b.to === null || taxableInUTM < b.to;
    return aboveFrom && belowTo;
  });

  if (!bracket || bracket.rate === 0) {
    return 0;
  }

  // Tax = (taxableInUTM * rate/100 - deduction) * utm
  const taxInUTM = taxableInUTM * (bracket.rate / 100) - bracket.deduction;

  if (taxInUTM <= 0) {
    return 0;
  }

  return roundCLP(taxInUTM * utmValue);
}
