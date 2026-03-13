import { PREVIRED_COLUMNS } from './columns.js';
import type { ColumnDefinition } from './columns.js';
import type { PreviredEmployee, PreviredFileData } from './types.js';

/**
 * Format a single value into a fixed-width field
 */
function formatField(value: string | number, col: ColumnDefinition): string {
  const str = String(value);
  const truncated = str.slice(0, col.width); // never overflow
  if (col.align === 'right') {
    return truncated.padStart(col.width, col.paddingChar);
  }
  return truncated.padEnd(col.width, col.paddingChar);
}

/**
 * Format a period as YYYYMM
 */
function formatPeriod(year: number, month: number): string {
  return `${year}${String(month).padStart(2, '0')}`;
}

/**
 * Generate a single employee record line
 */
function generateEmployeeRecord(emp: PreviredEmployee, period: string): string {
  const values: Record<string, string | number> = {
    recordType: 1,
    workerRut: emp.rut,
    workerRutDv: emp.rutDv,
    firstLastName: emp.firstLastName,
    secondLastName: emp.secondLastName,
    firstName: emp.firstName,
    period,
    daysWorked: emp.daysWorked,
    baseSalary: emp.baseSalary,
    gratification: emp.gratification,
    extraHours: emp.extraHours,
    otherImponible: emp.otherImponible,
    nonTaxableAllowances: emp.nonTaxableAllowances,
    totalImponibleAfp: emp.totalImponibleAfp,
    afpCode: emp.afpCode,
    afpWorkerAmount: emp.afpWorkerAmount,
    apvAmount: emp.apvAmount,
    sisAmount: emp.sisAmount,
    totalImponibleHealth: emp.totalImponibleHealth,
    healthCode: emp.healthCode,
    healthWorkerAmount: emp.healthWorkerAmount,
    unemploymentWorker: emp.unemploymentWorker,
    unemploymentEmployer: emp.unemploymentEmployer,
    totalTaxable: emp.totalTaxable,
    incomeTax: emp.incomeTax,
    mutualAmount: emp.mutualAmount,
    pensionReform: emp.pensionReform,
    netPay: emp.netPay,
  };

  return PREVIRED_COLUMNS.map(col => formatField(values[col.name] ?? '', col)).join('');
}

/**
 * Generate Previred fixed-width DDJJ file
 *
 * Each employee becomes one row. The resulting string uses \n line endings.
 *
 * @param data - Payroll data to export
 * @returns Fixed-width text file content
 */
export function generatePreviredFile(data: PreviredFileData): string {
  const period = formatPeriod(data.company.periodYear, data.company.periodMonth);
  const lines = data.employees.map(emp => generateEmployeeRecord(emp, period));
  return lines.join('\n');
}
