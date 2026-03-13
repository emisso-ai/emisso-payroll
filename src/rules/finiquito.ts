import { roundCLP, percentage } from '../money.js';

export type TerminationType =
  | 'renuncia'           // Voluntary resignation
  | 'despido_causa'      // Fired with cause (Art. 160) - no severance
  | 'despido_sin_causa'  // Fired without cause (Art. 161) - full severance
  | 'mutuo_acuerdo'      // Mutual agreement - severance negotiable
  | 'fin_plazo';         // Fixed-term contract expiry - no severance

export interface FiniquitoInput {
  hireDateStr: string;        // ISO date 'YYYY-MM-DD'
  terminationDateStr: string; // ISO date 'YYYY-MM-DD'
  terminationType: TerminationType;
  lastBaseSalary: number;     // CLP integer
  uf: number;                 // UF in CLP for indemnization cap
  imm: number;                // Minimum wage (for floor checks)
  monthlyGratificationIncluded: boolean; // Whether monthly pay includes legal gratification
}

export interface FiniquitoResult {
  // Vacation proportional (always owed)
  vacacionesProporcionales: number; // CLP

  // Proportional gratification for current year (if not included monthly)
  gratificacionProporcional: number; // CLP

  // Notice period (30 days pay) — only for despido_sin_causa
  avisoPrevio: number; // CLP

  // Severance (indemnizacion por años de servicio) — only for despido_sin_causa
  indemnizacionAnosServicio: number; // CLP

  // Metadata
  yearsOfService: number;       // Complete years worked
  monthsOfService: number;      // Total months worked
  daysInFinalMonth: number;     // Days in last partial month
  cappedAtUF: boolean;          // Whether indemnizacion was capped at 90 UF

  // Total
  total: number; // CLP
}

/**
 * Calculate finiquito (termination compensation) per Chilean Labor Code
 *
 * Art. 67: Vacation (15 business days/year, pro-rated)
 * Art. 161: Dismissal without cause → aviso previo + indemnizacion
 * Art. 163: Severance = 1 month per year (max 11 months, max 90 UF base)
 */
export function calculateFiniquito(input: FiniquitoInput): FiniquitoResult {
  const hireDate = new Date(input.hireDateStr);
  const termDate = new Date(input.terminationDateStr);

  // Calculate service duration
  const diffMs = termDate.getTime() - hireDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const yearsOfService = Math.floor(totalDays / 365);
  const monthsOfService = Math.floor(totalDays / 30);
  const daysInFinalMonth = totalDays - (yearsOfService * 365);

  // Daily salary (monthly / 30)
  const dailySalary = roundCLP(input.lastBaseSalary / 30);

  // 1. Vacaciones proporcionales
  // 15 business days per year, pro-rated for partial year
  // Simplification: 15 * (daysWorkedThisYear / 365) * dailySalary
  const daysThisYear = daysInFinalMonth + (monthsOfService % 12) * 30;
  const vacationDaysEarned = (15 * daysThisYear) / 365;
  const vacacionesProporcionales = roundCLP(vacationDaysEarned * dailySalary);

  // 2. Gratificación proporcional (if not included in monthly pay)
  // Legal gratification: min(25% of annual salary, 4.75 * IMM) / 12 per month
  // For finiquito, calculate remaining months of year not yet paid
  let gratificacionProporcional = 0;
  if (!input.monthlyGratificationIncluded) {
    const monthsThisYear = monthsOfService % 12;
    const annualGrat = Math.min(
      percentage(input.lastBaseSalary * 12, 25),
      roundCLP(4.75 * input.imm)
    );
    gratificacionProporcional = roundCLP((annualGrat / 12) * monthsThisYear);
  }

  // 3. Aviso previo — only for despido_sin_causa
  // 30 days notice pay = 1 month salary
  let avisoPrevio = 0;
  if (input.terminationType === 'despido_sin_causa') {
    avisoPrevio = input.lastBaseSalary; // 1 full month
  }

  // 4. Indemnización por años de servicio — only for despido_sin_causa
  // 1 month per complete year (Art. 163), capped at 11 months
  // Base capped at 90 UF
  let indemnizacionAnosServicio = 0;
  let cappedAtUF = false;

  if (input.terminationType === 'despido_sin_causa') {
    // Count years: if final month has > 6 months, count as full year
    const fractionalMonths = monthsOfService % 12;
    const effectiveYears = fractionalMonths > 6
      ? yearsOfService + 1
      : yearsOfService;
    const cappedYears = Math.min(effectiveYears, 11);

    // Base salary for indemnizacion capped at 90 UF
    const maxBase = roundCLP(90 * input.uf);
    const effectiveBase = Math.min(input.lastBaseSalary, maxBase);
    if (input.lastBaseSalary > maxBase) cappedAtUF = true;

    indemnizacionAnosServicio = effectiveBase * cappedYears;
  }

  const total = vacacionesProporcionales + gratificacionProporcional + avisoPrevio + indemnizacionAnosServicio;

  return {
    vacacionesProporcionales,
    gratificacionProporcional,
    avisoPrevio,
    indemnizacionAnosServicio,
    yearsOfService,
    monthsOfService,
    daysInFinalMonth,
    cappedAtUF,
    total,
  };
}
