/**
 * Unemployment insurance (Seguro de Cesantia) calculation rules
 *
 * Employee portion: 0.6% of imponible income
 * Employer portion: 2.4% (indefinido) or 3.0% (plazo_fijo/por_obra)
 */

import { percentage } from '../money.js';

const EMPLOYEE_RATE = 0.6;
const EMPLOYER_RATE_INDEFINIDO = 2.4;
const EMPLOYER_RATE_PLAZO_FIJO = 3.0;

/**
 * Calculate unemployment insurance for employee and employer.
 *
 * @param imponibleIncome - Imponible income in CLP
 * @param contractType - Type of employment contract
 * @returns Object with employee and employer portions in integer CLP
 */
export function calculateUnemployment(
  imponibleIncome: number,
  contractType: 'indefinido' | 'plazo_fijo' | 'por_obra'
): { employee: number; employer: number } {
  const employee = percentage(imponibleIncome, EMPLOYEE_RATE);

  const employerRate = contractType === 'indefinido'
    ? EMPLOYER_RATE_INDEFINIDO
    : EMPLOYER_RATE_PLAZO_FIJO;

  const employer = percentage(imponibleIncome, employerRate);

  return { employee, employer };
}
