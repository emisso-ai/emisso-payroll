/**
 * Reference data module
 *
 * Provides default reference data for Chilean payroll calculations
 * and interfaces for custom data providers.
 */

import type { ReferenceData } from './types.js';

/**
 * Default reference data for Chilean payroll calculations.
 * Values reflect February 2026 economic indicators.
 *
 * NOTE: These values change monthly/annually. For production use,
 * fetch current values from official sources using the providers module:
 *   import { fetchCurrentIndicators } from '@emisso/payroll-cl/providers'
 */
export const DEFAULT_REFERENCE_DATA: ReferenceData = {
  uf: 38_500,
  utm: 65_967,
  uta: 791_604,
  imm: 539_000,
  afpRates: {
    capital:   { commissionRate: 1.44, sisRate: 1.54 },
    cuprum:    { commissionRate: 1.44, sisRate: 1.54 },
    habitat:   { commissionRate: 1.27, sisRate: 1.54 },
    planvital: { commissionRate: 1.16, sisRate: 1.54 },
    provida:   { commissionRate: 1.45, sisRate: 1.54 },
    modelo:    { commissionRate: 0.58, sisRate: 1.54 },
    uno:       { commissionRate: 0.49, sisRate: 1.54 },
  },
  fonasaRate: 7,
  taxBrackets: [
    { from: 0,    to: 13.5,  rate: 0,    deduction: 0 },
    { from: 13.5, to: 30,    rate: 4,    deduction: 0.54 },
    { from: 30,   to: 50,    rate: 8,    deduction: 1.74 },
    { from: 50,   to: 70,    rate: 13.5, deduction: 4.49 },
    { from: 70,   to: 90,    rate: 23,   deduction: 11.14 },
    { from: 90,   to: 120,   rate: 30.4, deduction: 17.8 },
    { from: 120,  to: 310,   rate: 35.5, deduction: 23.92 },
    { from: 310,  to: null,  rate: 40,   deduction: 37.87 },
  ],
  familyAllowanceBrackets: [
    { from: 0,         to: 481_698,   amount: 14_872 },
    { from: 481_698,   to: 703_347,   amount: 9_108 },
    { from: 703_347,   to: 1_093_554, amount: 2_876 },
    { from: 1_093_554, to: null,      amount: 0 },
  ],
  unemploymentRate: 0.6,
  mutualRate: 0.93,
};

/**
 * Interface for custom reference data providers.
 * Implement this to fetch live data from official sources.
 */
export interface ReferenceDataProvider {
  /** Fetch current reference data */
  fetchReferenceData(): Promise<ReferenceData>;
}

/**
 * Economic indicators (updated monthly from official sources)
 */
export interface EconomicIndicators {
  uf: number;
  utm: number;
  uta: number;
  imm: number;
  effectiveDate: string;
}
