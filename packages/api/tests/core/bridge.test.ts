import { describe, it, expect } from "vitest";
import { buildReferenceData, employeeToEngineInput } from "../../src/core/bridge";
import type {
  ReferenceIndicator,
  ReferenceAfpRate,
  ReferenceTaxBracket,
  ReferenceFamilyAllowance,
  Employee,
  Earning,
  Deduction,
} from "../../src/db/schema/index";

// ── Test data ──

const mockIndicators: ReferenceIndicator = {
  id: "ind-1",
  effectiveDate: "2026-03-01",
  uf: "38500.00",
  utm: "66000.00",
  uta: "792000.00",
  imm: "500000.00",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAfpRates: ReferenceAfpRate[] = [
  {
    id: "afp-1",
    effectiveDate: "2026-03-01",
    afpProvider: "capital",
    commissionRate: "1.44",
    sisRate: "1.87",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "afp-2",
    effectiveDate: "2026-03-01",
    afpProvider: "modelo",
    commissionRate: "0.58",
    sisRate: "1.87",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTaxBrackets: ReferenceTaxBracket[] = [
  {
    id: "tb-1",
    effectiveDate: "2026-03-01",
    bracketIndex: 0,
    lowerBoundUf: "0.00",
    upperBoundUf: "13.50",
    marginalRate: "0.0000",
    fixedAmountUf: "0.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tb-2",
    effectiveDate: "2026-03-01",
    bracketIndex: 1,
    lowerBoundUf: "13.50",
    upperBoundUf: "30.00",
    marginalRate: "0.0400",
    fixedAmountUf: "0.54",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tb-3",
    effectiveDate: "2026-03-01",
    bracketIndex: 2,
    lowerBoundUf: "30.00",
    upperBoundUf: null,
    marginalRate: "0.0800",
    fixedAmountUf: "1.74",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockFamilyAllowance: ReferenceFamilyAllowance[] = [
  {
    id: "fa-1",
    effectiveDate: "2026-03-01",
    bracketIndex: 0,
    tranche: "A",
    lowerBoundClp: "0.00",
    upperBoundClp: "529000.00",
    allowancePerDependentClp: "18832.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "fa-2",
    effectiveDate: "2026-03-01",
    bracketIndex: 1,
    tranche: "B",
    lowerBoundClp: "529000.01",
    upperBoundClp: null,
    allowancePerDependentClp: "11553.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ── Tests ──

describe("buildReferenceData", () => {
  it("converts numeric strings to numbers", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.uf).toBe(38500);
    expect(result.utm).toBe(66000);
    expect(result.uta).toBe(792000);
    expect(result.imm).toBe(500000);
  });

  it("hardcodes fonasaRate and unemploymentRate", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.fonasaRate).toBe(7);
    expect(result.unemploymentRate).toBe(0.6);
  });

  it("passes through mutualRate", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      1.5,
    );

    expect(result.mutualRate).toBe(1.5);
  });

  it("builds AFP rates as Record<provider, rates>", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.afpRates.capital).toEqual({
      commissionRate: 1.44,
      sisRate: 1.87,
    });
    expect(result.afpRates.modelo).toEqual({
      commissionRate: 0.58,
      sisRate: 1.87,
    });
  });

  it("converts marginalRate * 100 for tax brackets", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.taxBrackets).toHaveLength(3);
    expect(result.taxBrackets[0]!.rate).toBe(0); // 0.0000 * 100
    expect(result.taxBrackets[1]!.rate).toBe(4); // 0.0400 * 100
    expect(result.taxBrackets[2]!.rate).toBe(8); // 0.0800 * 100
  });

  it("handles null upper bounds in tax brackets", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.taxBrackets[2]!.to).toBeNull();
  });

  it("handles null upper bounds in family allowance brackets", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.familyAllowanceBrackets[1]!.to).toBeNull();
  });

  it("sorts tax brackets by bracketIndex", () => {
    const reversed = [...mockTaxBrackets].reverse();
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      reversed,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.taxBrackets[0]!.from).toBe(0);
    expect(result.taxBrackets[1]!.from).toBe(13.5);
    expect(result.taxBrackets[2]!.from).toBe(30);
  });

  it("converts family allowance amounts to numbers", () => {
    const result = buildReferenceData(
      mockIndicators,
      mockAfpRates,
      mockTaxBrackets,
      mockFamilyAllowance,
      0.93,
    );

    expect(result.familyAllowanceBrackets[0]!.amount).toBe(18832);
    expect(result.familyAllowanceBrackets[1]!.amount).toBe(11553);
  });
});

describe("employeeToEngineInput", () => {
  const mockEmployee: Employee = {
    id: "emp-1",
    tenantId: "tenant-1",
    rut: "12345678-5",
    firstName: "Juan",
    lastName: "Pérez",
    email: null,
    phone: null,
    birthDate: null,
    nationality: "Chilena",
    address: null,
    city: null,
    region: null,
    hireDate: "2024-01-01",
    terminationDate: null,
    contractType: "indefinido",
    contractStartDate: null,
    contractEndDate: null,
    position: null,
    workSchedule: null,
    baseSalary: 1000000,
    gratificationType: "legal",
    gratificationAmount: 0,
    colacion: 50000,
    movilizacion: 30000,
    afpCode: "capital",
    afpFund: "c",
    healthPlan: "fonasa",
    isapreCode: null,
    isapreName: null,
    isapreAmount: 0,
    apvAmount: 0,
    apvPercentage: "0",
    familyAllowanceLoads: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEarnings: Earning[] = [
    {
      id: "e-1",
      tenantId: "tenant-1",
      payrollRunId: "run-1",
      employeeId: "emp-1",
      type: "bonus",
      description: "Performance bonus",
      amount: 100000,
      isTaxable: true,
      isImponible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockDeductions: Deduction[] = [
    {
      id: "d-1",
      tenantId: "tenant-1",
      payrollRunId: "run-1",
      employeeId: "emp-1",
      type: "loan",
      description: "Personal loan",
      amount: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("maps employee fields correctly", () => {
    const result = employeeToEngineInput(mockEmployee, [], []);

    expect(result.employeeId).toBe("emp-1");
    expect(result.rut).toBe("12345678-5");
    expect(result.firstName).toBe("Juan");
    expect(result.lastName).toBe("Pérez");
    expect(result.baseSalary).toBe(1000000);
    expect(result.gratificationType).toBe("legal");
    expect(result.colacion).toBe(50000);
    expect(result.movilizacion).toBe(30000);
    expect(result.afpCode).toBe("capital");
    expect(result.afpFund).toBe("c");
    expect(result.healthPlan).toBe("fonasa");
    expect(result.familyAllowanceLoads).toBe(2);
  });

  it("converts null amounts to 0 or undefined", () => {
    const empWithNulls = { ...mockEmployee, colacion: null, movilizacion: null, isapreAmount: null, apvAmount: null };
    const result = employeeToEngineInput(empWithNulls as any, [], []);

    expect(result.colacion).toBe(0);
    expect(result.movilizacion).toBe(0);
    expect(result.isapreAmount).toBeUndefined();
    expect(result.apvAmount).toBeUndefined();
  });

  it("maps earnings to engine format", () => {
    const result = employeeToEngineInput(mockEmployee, mockEarnings, []);

    expect(result.earnings).toHaveLength(1);
    expect(result.earnings[0]).toEqual({
      type: "bonus",
      description: "Performance bonus",
      amount: 100000,
      isTaxable: true,
      isImponible: true,
    });
  });

  it("maps deductions to engine format", () => {
    const result = employeeToEngineInput(mockEmployee, [], mockDeductions);

    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0]).toEqual({
      type: "loan",
      description: "Personal loan",
      amount: 50000,
    });
  });

  it("handles empty earnings and deductions", () => {
    const result = employeeToEngineInput(mockEmployee, [], []);

    expect(result.earnings).toEqual([]);
    expect(result.deductions).toEqual([]);
  });
});
