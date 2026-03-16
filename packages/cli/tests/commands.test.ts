import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import {
  calculateOvertime,
  calculateEmployeePayroll,
  DEFAULT_REFERENCE_DATA,
  solveNetToGross,
  calculateFiniquito,
  validateRut,
  formatRut,
  formatCLP,
} from "@emisso/payroll";
import type { EmployeePayrollInput, NetToGrossInput } from "@emisso/payroll";
import { makeTestRenderer, OutputRenderer } from "@emisso/cli-core";

const sampleEmployee: EmployeePayrollInput = {
  employeeId: "test-1",
  rut: "12345678-5",
  firstName: "Test",
  lastName: "User",
  baseSalary: 1_000_000,
  gratificationType: "legal",
  colacion: 50_000,
  movilizacion: 30_000,
  afpCode: "habitat",
  afpFund: "c",
  healthPlan: "fonasa",
  familyAllowanceLoads: 0,
  contractType: "indefinido",
  earnings: [],
  deductions: [],
};

describe("RUT commands", () => {
  it("validates a valid RUT", () => {
    expect(validateRut("12345678-5")).toBe(true);
  });

  it("validates an invalid RUT", () => {
    expect(validateRut("12345678-0")).toBe(false);
  });

  it("formats a RUT with dots and hyphen", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });
});

describe("Overtime command", () => {
  it("calculates overtime pay correctly", () => {
    const result = calculateOvertime(10, 1_000_000);
    expect(result).toBeGreaterThan(0);
    // 10 * (1000000 / 45 / 4.33) * 1.5 ≈ 76,982
    expect(result).toBe(76_982);
  });

  it("returns 0 for zero hours", () => {
    expect(calculateOvertime(0, 1_000_000)).toBe(0);
  });
});

describe("Calculate-employee command", () => {
  it("calculates payroll for a single employee", () => {
    const result = calculateEmployeePayroll(sampleEmployee, DEFAULT_REFERENCE_DATA);

    expect(result.employeeId).toBe("test-1");
    expect(result.earnings.baseSalary).toBe(1_000_000);
    expect(result.earnings.gratification).toBeGreaterThan(0);
    expect(result.deductions.afp).toBeGreaterThan(0);
    expect(result.deductions.health).toBeGreaterThan(0);
    expect(result.netPay).toBeGreaterThan(0);
    expect(result.netPay).toBeLessThan(
      result.earnings.baseSalary + result.earnings.gratification +
      sampleEmployee.colacion + sampleEmployee.movilizacion,
    );
  });
});

describe("Net-to-gross command", () => {
  it("converges to a gross salary", () => {
    const input: NetToGrossInput = {
      rut: "0-0",
      firstName: "Test",
      lastName: "User",
      targetNetPay: 1_000_000,
      gratificationType: "legal",
      colacion: 0,
      movilizacion: 0,
      afpCode: "habitat",
      afpFund: "c",
      healthPlan: "fonasa",
      familyAllowanceLoads: 0,
      earnings: [],
      deductions: [],
    };

    const result = solveNetToGross(input, DEFAULT_REFERENCE_DATA);
    expect(result.converged).toBe(true);
    expect(result.grossSalary).toBeGreaterThan(0);
    expect(Math.abs(result.actualNetPay - 1_000_000)).toBeLessThanOrEqual(1);
  });
});

describe("Finiquito command", () => {
  it("calculates finiquito for despido sin causa", () => {
    const result = calculateFiniquito({
      hireDateStr: "2020-01-15",
      terminationDateStr: "2026-03-15",
      terminationType: "despido_sin_causa",
      lastBaseSalary: 1_500_000,
      uf: DEFAULT_REFERENCE_DATA.uf,
      imm: DEFAULT_REFERENCE_DATA.imm,
      monthlyGratificationIncluded: true,
    });

    expect(result.vacacionesProporcionales).toBeGreaterThan(0);
    expect(result.avisoPrevio).toBe(1_500_000);
    expect(result.indemnizacionAnosServicio).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.yearsOfService).toBeGreaterThanOrEqual(6);
  });

  it("no severance for voluntary resignation", () => {
    const result = calculateFiniquito({
      hireDateStr: "2020-01-15",
      terminationDateStr: "2026-03-15",
      terminationType: "renuncia",
      lastBaseSalary: 1_500_000,
      uf: DEFAULT_REFERENCE_DATA.uf,
      imm: DEFAULT_REFERENCE_DATA.imm,
      monthlyGratificationIncluded: true,
    });

    expect(result.avisoPrevio).toBe(0);
    expect(result.indemnizacionAnosServicio).toBe(0);
    expect(result.vacacionesProporcionales).toBeGreaterThan(0);
  });
});

describe("Indicators command", () => {
  it("DEFAULT_REFERENCE_DATA has all required fields", () => {
    expect(DEFAULT_REFERENCE_DATA.uf).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_DATA.utm).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_DATA.uta).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_DATA.imm).toBeGreaterThan(0);
    expect(DEFAULT_REFERENCE_DATA.fonasaRate).toBe(7);
    expect(DEFAULT_REFERENCE_DATA.afpRates).toBeDefined();
    expect(Object.keys(DEFAULT_REFERENCE_DATA.afpRates).length).toBeGreaterThan(0);
  });
});

describe("OutputRenderer integration", () => {
  it("captures rendered output via makeTestRenderer", async () => {
    const { stdout, layer } = makeTestRenderer();

    const program = Effect.gen(function* () {
      const renderer = yield* OutputRenderer;
      yield* renderer.renderSuccess({ test: true }, 100);
    });

    await Effect.runPromise(Effect.provide(program, layer));

    expect(stdout).toHaveLength(1);
    const parsed = JSON.parse(stdout[0]);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.test).toBe(true);
    expect(parsed.meta.duration_ms).toBe(100);
  });
});
