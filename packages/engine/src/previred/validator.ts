import type { PreviredFileData } from './types.js';
import { AFP_PREVIRED_CODES, HEALTH_PREVIRED_CODES } from './afp-codes.js';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

const VALID_AFP_CODES = new Set(Object.values(AFP_PREVIRED_CODES));
const VALID_HEALTH_CODES = new Set(Object.values(HEALTH_PREVIRED_CODES));
const VALID_AFP_CODES_STR = [...VALID_AFP_CODES].join(', ');

function addError(errors: ValidationResult['errors'], field: string, message: string, value?: unknown) {
  errors.push({ field, message, value });
}

/**
 * Validate Previred data before file generation
 */
export function validatePreviredData(data: PreviredFileData): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Validate company
  if (!data.company.rut || data.company.rut.length < 7) {
    addError(errors, 'company.rut', 'RUT empresa inválido', data.company.rut);
  }
  if (data.company.periodMonth < 1 || data.company.periodMonth > 12) {
    addError(errors, 'company.periodMonth', 'Mes inválido (debe ser 1-12)', data.company.periodMonth);
  }
  if (data.company.periodYear < 2000 || data.company.periodYear > 2100) {
    addError(errors, 'company.periodYear', 'Año inválido', data.company.periodYear);
  }

  // Validate each employee
  data.employees.forEach((emp, idx) => {
    const prefix = `employees[${idx}]`;

    if (!emp.rut || emp.rut.length < 7) {
      addError(errors, `${prefix}.rut`, 'RUT trabajador inválido', emp.rut);
    }
    if (emp.daysWorked < 0 || emp.daysWorked > 30) {
      addError(errors, `${prefix}.daysWorked`, 'Días trabajados debe ser 0-30', emp.daysWorked);
    }
    if (emp.baseSalary < 0) {
      addError(errors, `${prefix}.baseSalary`, 'Sueldo base no puede ser negativo', emp.baseSalary);
    }
    if (!VALID_AFP_CODES.has(emp.afpCode)) {
      addError(errors, `${prefix}.afpCode`, `Código AFP inválido. Válidos: ${VALID_AFP_CODES_STR}`, emp.afpCode);
    }
    if (!VALID_HEALTH_CODES.has(emp.healthCode)) {
      addError(errors, `${prefix}.healthCode`, `Código salud inválido`, emp.healthCode);
    }
    if (emp.incomeTax < 0) {
      addError(errors, `${prefix}.incomeTax`, 'Impuesto único no puede ser negativo', emp.incomeTax);
    }
    if (emp.netPay < 0) {
      addError(errors, `${prefix}.netPay`, 'Líquido a pagar no puede ser negativo', emp.netPay);
    }
  });

  return { valid: errors.length === 0, errors };
}
