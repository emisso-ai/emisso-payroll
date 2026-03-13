import type { EmployeePayrollInput } from '../../src/types';

/**
 * Sample employee data for testing
 */
export const sampleEmployee: EmployeePayrollInput = {
  employeeId: '123e4567-e89b-12d3-a456-426614174000',
  rut: '12345678-9',
  firstName: 'Juan',
  lastName: 'Pérez',
  baseSalary: 1000000, // 1M CLP
  gratificationType: 'legal',
  colacion: 50000,
  movilizacion: 30000,
  afpCode: 'capital',
  afpFund: 'c',
  healthPlan: 'fonasa',
  familyAllowanceLoads: 2,
  earnings: [],
  deductions: [],
};

/**
 * Sample employee with Isapre
 */
export const employeeWithIsapre: EmployeePayrollInput = {
  ...sampleEmployee,
  employeeId: '223e4567-e89b-12d3-a456-426614174001',
  healthPlan: 'isapre',
  isapreAmount: 50000,
};

/**
 * Sample high-income employee
 */
export const highIncomeEmployee: EmployeePayrollInput = {
  ...sampleEmployee,
  employeeId: '323e4567-e89b-12d3-a456-426614174002',
  baseSalary: 5000000, // 5M CLP
  gratificationType: 'convenida',
  gratificationAmount: 500000,
};
