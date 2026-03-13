/**
 * Previred file format types
 * Previred is the Chilean system for reporting social security payments
 * Reference: Previred DDJJ technical specification
 */

/** Employee data for Previred file generation */
export interface PreviredEmployee {
  // Identity
  rut: string;            // e.g. '12345678' (without dash and DV)
  rutDv: string;          // Verification digit, e.g. '9' or 'K'
  firstName: string;      // Up to 20 chars
  firstLastName: string;  // Up to 24 chars (apellido paterno)
  secondLastName: string; // Up to 24 chars (apellido materno)

  // Period
  daysWorked: number;     // 0-30

  // Remunerations (all CLP integers)
  baseSalary: number;           // Sueldo base
  gratification: number;        // Gratificación incluida
  otherImponible: number;       // Otras remuneraciones imponibles
  extraHours: number;           // Horas extras amount
  nonTaxableAllowances: number; // Colación + movilización (no imponibles)
  totalImponibleAfp: number;    // Total imponible AFP
  totalImponibleHealth: number; // Total imponible salud
  totalTaxable: number;         // Base imponible para impuesto único

  // AFP
  afpCode: string;          // Código AFP (e.g. '03' = Capital, '05' = Habitat, etc.)
  afpWorkerAmount: number;  // Cotización obligatoria AFP worker
  sisAmount: number;        // SIS (Seguro de Invalidez y Sobrevivencia)
  apvAmount: number;        // APV voluntary contribution

  // Health
  healthCode: string;         // '07' = FONASA, code for each ISAPRE
  healthWorkerAmount: number; // Cotización salud worker

  // Unemployment insurance
  unemploymentWorker: number;   // AFC employee portion (0.6%)
  unemploymentEmployer: number; // AFC employer portion (2.4% or 3%)

  // Tax
  incomeTax: number;     // Impuesto único retenido

  // Net pay
  netPay: number;        // Líquido a pagar

  // Employer costs (for reporting)
  mutualAmount: number;      // ACHS/mutual contribution
  pensionReform: number;     // Aporte previsional reforma (Law 21.720)
}

/** Company data for Previred file header */
export interface PreviredCompany {
  rut: string;         // Company RUT without DV (e.g. '76123456')
  rutDv: string;       // DV of company RUT
  businessName: string; // Razón social (up to 40 chars)
  periodYear: number;   // e.g. 2026
  periodMonth: number;  // 1-12
}

/** Complete Previred file data */
export interface PreviredFileData {
  company: PreviredCompany;
  employees: PreviredEmployee[];
}
