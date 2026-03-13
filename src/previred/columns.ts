/**
 * Previred 105-column fixed-width file format definition
 *
 * Format rules:
 * - Numeric fields: right-aligned, zero-padded
 * - Text fields: left-aligned, space-padded
 * - Total row width: ~350 characters (variable by version)
 *
 * Reference: Previred DDJJ technical specification
 */

export interface ColumnDefinition {
  position: number;  // 1-based start position
  width: number;     // Field width in chars
  name: string;      // Field identifier
  type: 'numeric' | 'text' | 'alpha';
  align: 'left' | 'right';
  paddingChar: string; // '0' for numeric, ' ' for text
}

/**
 * Helper to create a right-aligned numeric column (zero-padded)
 */
function num(position: number, width: number, name: string): ColumnDefinition {
  return { position, width, name, type: 'numeric', align: 'right', paddingChar: '0' };
}

/**
 * Helper to create a left-aligned text column (space-padded)
 */
function txt(position: number, width: number, name: string): ColumnDefinition {
  return { position, width, name, type: 'text', align: 'left', paddingChar: ' ' };
}

/**
 * Previred DDJJ column definitions
 * Based on the standard Previred "Planilla de Cotizaciones" format
 */
export const PREVIRED_COLUMNS: ColumnDefinition[] = [
  // Record identification
  num(1,  2,  'recordType'),        // 01 = employee record
  num(3,  9,  'workerRut'),         // RUT without DV, right-padded with zeros
  txt(12, 1,  'workerRutDv'),       // DV character
  txt(13, 24, 'firstLastName'),     // Apellido paterno
  txt(37, 24, 'secondLastName'),    // Apellido materno
  txt(61, 20, 'firstName'),         // Nombres
  num(81, 6,  'period'),            // YYYYMM
  num(87, 2,  'daysWorked'),        // Días trabajados

  // Remunerations
  num(89,  11, 'baseSalary'),           // Sueldo base
  num(100, 11, 'gratification'),        // Gratificación
  num(111, 11, 'extraHours'),           // Horas extras
  num(122, 11, 'otherImponible'),       // Otras rem. imponibles
  num(133, 11, 'nonTaxableAllowances'), // No imponibles (colación, movilización)
  num(144, 11, 'totalImponibleAfp'),    // Total imponible AFP

  // AFP
  txt(155, 3,  'afpCode'),          // Código AFP
  num(158, 11, 'afpWorkerAmount'),  // Cotización AFP trabajador
  num(169, 11, 'apvAmount'),        // APV
  num(180, 11, 'sisAmount'),        // SIS

  // Health
  num(191, 11, 'totalImponibleHealth'), // Total imponible salud
  txt(202, 3,  'healthCode'),           // Código de salud
  num(205, 11, 'healthWorkerAmount'),   // Cotización salud trabajador

  // Unemployment
  num(216, 11, 'unemploymentWorker'),   // Seguro cesantía trabajador
  num(227, 11, 'unemploymentEmployer'), // Seguro cesantía empleador

  // Tax and net pay
  num(238, 11, 'totalTaxable'),         // Base imponible impuesto
  num(249, 11, 'incomeTax'),            // Impuesto único

  // Employer costs
  num(260, 11, 'mutualAmount'),         // Mutual (ACHS)
  num(271, 11, 'pensionReform'),        // Aporte previsional reforma

  // Net
  num(282, 11, 'netPay'),               // Líquido a pagar
];
