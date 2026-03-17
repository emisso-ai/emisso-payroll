import { describe, expect, it } from "vitest";
import { formatTable, formatCsv } from "@emisso/cli-core";
import {
  payrollResultColumns,
  finiquitoColumns,
  overtimeColumns,
  indicatorColumns,
  rutColumns,
  netToGrossColumns,
} from "../src/formatters/payroll-table";

describe("Column definitions", () => {
  const allColumnSets = [
    { name: "payrollResultColumns", columns: payrollResultColumns },
    { name: "finiquitoColumns", columns: finiquitoColumns },
    { name: "overtimeColumns", columns: overtimeColumns },
    { name: "indicatorColumns", columns: indicatorColumns },
    { name: "rutColumns", columns: rutColumns },
    { name: "netToGrossColumns", columns: netToGrossColumns },
  ];

  for (const { name, columns } of allColumnSets) {
    it(`${name} has valid Column shapes`, () => {
      expect(columns.length).toBeGreaterThan(0);
      for (const col of columns) {
        expect(col).toHaveProperty("key");
        expect(col).toHaveProperty("label");
        expect(typeof col.key).toBe("string");
        expect(typeof col.label).toBe("string");
      }
    });
  }
});

describe("formatTable with payroll columns", () => {
  it("renders payroll results as a table", () => {
    const rows = [
      {
        employeeId: "emp-001",
        baseSalary: "1.000.000",
        gratification: "213.354",
        totalImponible: "1.213.354",
        afp: "15.410",
        health: "84.935",
        incomeTax: "23.439",
        totalDeductions: "131.064",
        netPay: "1.082.290",
      },
    ];

    const output = formatTable(payrollResultColumns, rows);
    expect(output).toContain("Employee ID");
    expect(output).toContain("Net Pay");
    expect(output).toContain("1.082.290");
  });
});

describe("formatCsv with payroll columns", () => {
  it("renders payroll results as CSV", () => {
    const csvColumns = payrollResultColumns.map((c) => ({
      key: c.key,
      label: c.label,
    }));

    const rows = [
      {
        employeeId: "emp-001",
        baseSalary: "1.000.000",
        netPay: "1.082.290",
      },
    ];

    const output = formatCsv(csvColumns, rows);
    expect(output).toContain("Employee ID");
    expect(output).toContain("emp-001");
    expect(output).toContain("1.082.290");
  });
});
