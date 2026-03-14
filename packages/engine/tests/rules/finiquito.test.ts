import { describe, it, expect } from 'vitest';
import { calculateFiniquito } from '../../src/rules/finiquito.js';

const baseInput = {
  hireDateStr: '2022-01-01',
  terminationDateStr: '2026-01-31',
  terminationType: 'renuncia' as const,
  lastBaseSalary: 1_000_000,
  uf: 38500,
  imm: 539000,
  monthlyGratificationIncluded: true,
};

describe('calculateFiniquito', () => {
  it('renuncia: only vacaciones, no severance', () => {
    const result = calculateFiniquito(baseInput);
    expect(result.avisoPrevio).toBe(0);
    expect(result.indemnizacionAnosServicio).toBe(0);
    expect(result.vacacionesProporcionales).toBeGreaterThan(0);
  });

  it('despido_causa: only vacaciones, no severance', () => {
    const result = calculateFiniquito({ ...baseInput, terminationType: 'despido_causa' });
    expect(result.avisoPrevio).toBe(0);
    expect(result.indemnizacionAnosServicio).toBe(0);
  });

  it('despido_sin_causa: all entitlements', () => {
    const result = calculateFiniquito({ ...baseInput, terminationType: 'despido_sin_causa' });
    expect(result.avisoPrevio).toBe(1_000_000);
    expect(result.indemnizacionAnosServicio).toBeGreaterThan(0);
    expect(result.vacacionesProporcionales).toBeGreaterThan(0);
  });

  it('4 years service: indemnizacion = 4 * salary', () => {
    const result = calculateFiniquito({
      ...baseInput,
      hireDateStr: '2020-01-01',
      terminationDateStr: '2024-01-31',
      terminationType: 'despido_sin_causa',
    });
    expect(result.yearsOfService).toBe(4);
    expect(result.indemnizacionAnosServicio).toBe(4_000_000);
  });

  it('cap at 11 months for long tenure', () => {
    const result = calculateFiniquito({
      ...baseInput,
      hireDateStr: '2000-01-01',
      terminationDateStr: '2026-01-31',
      terminationType: 'despido_sin_causa',
    });
    expect(result.indemnizacionAnosServicio).toBe(11_000_000);
  });

  it('cap at 90 UF when salary > 90 UF', () => {
    const highSalary = Math.round(95 * 38500);
    const result = calculateFiniquito({
      ...baseInput,
      lastBaseSalary: highSalary,
      terminationType: 'despido_sin_causa',
    });
    expect(result.cappedAtUF).toBe(true);
    const expectedBase = 90 * 38500;
    const years = result.yearsOfService > 11 ? 11 : result.yearsOfService;
    expect(result.indemnizacionAnosServicio).toBe(expectedBase * years);
  });

  it('total = sum of all components', () => {
    const result = calculateFiniquito({ ...baseInput, terminationType: 'despido_sin_causa' });
    expect(result.total).toBe(
      result.vacacionesProporcionales +
      result.gratificacionProporcional +
      result.avisoPrevio +
      result.indemnizacionAnosServicio
    );
  });

  it('fin_plazo: no severance', () => {
    const result = calculateFiniquito({ ...baseInput, terminationType: 'fin_plazo' });
    expect(result.avisoPrevio).toBe(0);
    expect(result.indemnizacionAnosServicio).toBe(0);
  });

  it('yearOfService counting', () => {
    const result = calculateFiniquito({
      ...baseInput,
      hireDateStr: '2024-01-01',
      terminationDateStr: '2026-01-31',
      terminationType: 'renuncia',
    });
    expect(result.yearsOfService).toBe(2);
  });
});
