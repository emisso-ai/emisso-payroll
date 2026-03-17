/**
 * Column definitions for payroll result tables
 */

import type { Column } from "@emisso/cli-core";

export const payrollResultColumns: Column[] = [
  { key: "employeeId", label: "Employee ID", width: 16 },
  { key: "baseSalary", label: "Base Salary", align: "right" },
  { key: "gratification", label: "Gratificación", align: "right" },
  { key: "totalImponible", label: "Imponible", align: "right" },
  { key: "afp", label: "AFP", align: "right" },
  { key: "health", label: "Health", align: "right" },
  { key: "incomeTax", label: "Tax", align: "right" },
  { key: "totalDeductions", label: "Deductions", align: "right" },
  { key: "netPay", label: "Net Pay", align: "right" },
];

export const finiquitoColumns: Column[] = [
  { key: "concept", label: "Concepto", width: 30 },
  { key: "amount", label: "Monto (CLP)", align: "right" },
];

export const overtimeColumns: Column[] = [
  { key: "field", label: "Campo" },
  { key: "value", label: "Valor", align: "right" },
];

export const indicatorColumns: Column[] = [
  { key: "name", label: "Indicador", width: 20 },
  { key: "value", label: "Valor", align: "right" },
];

export const rutColumns: Column[] = [
  { key: "field", label: "Campo" },
  { key: "value", label: "Valor" },
];

export const netToGrossColumns: Column[] = [
  { key: "field", label: "Campo", width: 25 },
  { key: "value", label: "Valor", align: "right" },
];
