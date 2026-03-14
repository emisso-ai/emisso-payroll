/**
 * Chilean RUT (Rol Único Tributario) utilities
 *
 * RUT format: XX.XXX.XXX-Y where Y is a check digit (0-9 or K)
 * Validation uses modulo 11 algorithm
 */

/**
 * Remove all formatting characters from RUT (dots, hyphens, spaces)
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

/**
 * Parse RUT into its components: number and verifier
 * @returns Object with number (without verifier) and verifier digit
 */
export function parseRut(rut: string): { number: number; verifier: string } {
  const cleaned = cleanRut(rut);

  if (cleaned.length < 2) {
    throw new Error('RUT inválido: muy corto');
  }

  const verifier = cleaned.slice(-1);
  const number = Number.parseInt(cleaned.slice(0, -1), 10);

  if (Number.isNaN(number)) {
    throw new Error('RUT inválido: número no válido');
  }

  return { number, verifier };
}

/**
 * Calculate the verifier digit for a given RUT number using modulo 11 algorithm
 */
function calculateVerifier(rutNumber: number): string {
  let sum = 0;
  let multiplier = 2;
  let tempRut = rutNumber;

  while (tempRut > 0) {
    sum += (tempRut % 10) * multiplier;
    tempRut = Math.floor(tempRut / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const verifier = 11 - remainder;

  if (verifier === 11) return '0';
  if (verifier === 10) return 'K';
  return verifier.toString();
}

/**
 * Validate if a RUT is valid according to Chilean mod-11 algorithm
 */
export function validateRut(rut: string): boolean {
  try {
    const { number, verifier } = parseRut(rut);
    const expectedVerifier = calculateVerifier(number);
    return verifier === expectedVerifier;
  } catch {
    return false;
  }
}

/**
 * Format RUT with dots and hyphen: 12.345.678-9
 */
export function formatRut(rut: string): string {
  const { number, verifier } = parseRut(rut);

  // Add thousands separators
  const formatted = number.toLocaleString('es-CL');

  return `${formatted}-${verifier}`;
}
