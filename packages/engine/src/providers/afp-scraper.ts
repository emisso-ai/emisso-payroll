/**
 * AFP Commission Rates Scraper
 *
 * Scrapes AFP commission rates from the Superintendencia de Pensiones website.
 * Uses Effect-ts for error handling and cheerio for HTML parsing.
 *
 * Data Source: https://www.spensiones.cl/apps/comisiones/getComisAPV.php
 *
 * IMPORTANT NOTE: The provided URL (getComisAPV.php) returns APV (Ahorro Previsional Voluntario)
 * commission rates, not the mandatory AFP contribution rates. This scraper is designed to be
 * flexible and can be adapted to scrape the mandatory contribution rates when the correct
 * endpoint is identified.
 *
 * According to web research, as of January 2026:
 * - AFP commission rates range from 0.46% to 1.45%
 * - SIS (Seguro de Invalidez y Sobrevivencia) rate is uniform at 1.54%
 *
 * @see https://www.spensiones.cl/
 */

import { Effect, Data } from "effect";
import { z } from "zod";
import * as cheerio from "cheerio";

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Network error - failed to fetch from API
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly _type: "NetworkError";
  readonly message: string;
  readonly url: string;
  readonly cause?: unknown;
}> {
  static make(url: string, cause?: unknown): NetworkError {
    const message = cause instanceof Error
      ? `Error de red al consultar ${url}: ${cause.message}`
      : `Error de red al consultar ${url}`;

    return new NetworkError({
      _type: "NetworkError",
      message,
      url,
      cause,
    });
  }
}

/**
 * Parse error - failed to parse HTML response
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly _type: "ParseError";
  readonly message: string;
  readonly cause?: unknown;
}> {
  static make(cause?: unknown): ParseError {
    const message = cause instanceof Error
      ? `Error al parsear respuesta HTML: ${cause.message}`
      : "Error al parsear respuesta HTML";

    return new ParseError({
      _type: "ParseError",
      message,
      cause,
    });
  }
}

/**
 * Validation error - extracted data doesn't match expected schema
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly _type: "ValidationError";
  readonly message: string;
  readonly errors: Array<{ path: string; message: string }>;
}> {
  static make(errors: Array<{ path: string; message: string }>): ValidationError {
    return new ValidationError({
      _type: "ValidationError",
      message: "Los datos extraídos no cumplen con el formato esperado",
      errors,
    });
  }

  static fromZodError(error: z.ZodError): ValidationError {
    const errors = error.errors.map(e => ({
      path: e.path.join("."),
      message: e.message,
    }));

    return ValidationError.make(errors);
  }
}

/**
 * Scraping error - failed to extract expected data from HTML
 */
export class ScrapingError extends Data.TaggedError("ScrapingError")<{
  readonly _type: "ScrapingError";
  readonly message: string;
  readonly details?: string;
}> {
  static make(message: string, details?: string): ScrapingError {
    return new ScrapingError({
      _type: "ScrapingError",
      message,
      details,
    });
  }
}

/**
 * Union of all fetcher errors
 */
export type AFPScraperError = NetworkError | ParseError | ValidationError | ScrapingError;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Single AFP rate entry
 */
export interface AFPRate {
  /** AFP provider name (e.g., "Capital", "Cuprum") */
  afpProvider: string;
  /** Commission rate as percentage (e.g., 1.44 for 1.44%) */
  commissionRate: number;
  /** SIS (Seguro de Invalidez y Sobrevivencia) rate as percentage */
  sisRate: number;
  /** Effective date of these rates */
  effectiveDate: Date;
}

/**
 * Zod schema for a single AFP rate
 */
const AFPRateSchema = z.object({
  afpProvider: z.string().min(1, "El nombre del AFP es requerido"),
  commissionRate: z.number()
    .min(0.4, "La comisión debe ser mayor a 0.4%")
    .max(2.0, "La comisión debe ser menor a 2.0%"),
  sisRate: z.number()
    .min(1.0, "La tasa SIS debe ser mayor a 1.0%")
    .max(2.0, "La tasa SIS debe ser menor a 2.0%"),
  effectiveDate: z.date(),
});

/**
 * Zod schema for array of AFP rates
 */
const AFPRatesArraySchema = z.array(AFPRateSchema).min(7, "Se esperan datos de las 7 AFPs");

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Base URL for AFP commission data
 * NOTE: This URL returns APV data, not mandatory contribution rates
 */
const AFP_COMMISSION_BASE_URL = "https://www.spensiones.cl/apps/comisiones/getComisAPV.php";

/**
 * Expected AFP provider names (normalized to uppercase for comparison)
 */
const EXPECTED_AFP_PROVIDERS = [
  "CAPITAL",
  "CUPRUM",
  "HABITAT",
  "PLANVITAL",
  "PROVIDA",
  "MODELO",
  "UNO"
] as const;

/**
 * Default SIS rate (as of January 2026)
 * This is used as fallback since the APV page doesn't include SIS rates
 */
const DEFAULT_SIS_RATE = 1.54;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetches current AFP commission rates for a specific month
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Effect that resolves to array of AFP rates or fails with typed error
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { fetchAFPRates } from "@emisso/payroll/providers/node";
 *
 * const program = Effect.gen(function* () {
 *   const rates = yield* fetchAFPRates(2026, 2);
 *   console.log(`Found ${rates.length} AFP rates`);
 *   for (const rate of rates) {
 *     console.log(`${rate.afpProvider}: ${rate.commissionRate}% + ${rate.sisRate}% SIS`);
 *   }
 *   return rates;
 * });
 *
 * Effect.runPromise(program)
 *   .then(data => console.log("Success:", data))
 *   .catch(error => console.error("Error:", error));
 * ```
 */
export function fetchAFPRates(
  year: number,
  month: number
): Effect.Effect<AFPRate[], AFPScraperError, never> {
  return Effect.gen(function* () {
    // Step 1: Validate input parameters
    yield* validateDateParameters(year, month);

    // Step 2: Build URL with date parameter
    const url = buildURL(year, month);

    // Step 3: Fetch HTML from the website
    const html = yield* fetchHTML(url);

    // Step 4: Parse HTML and extract AFP data
    const rates = yield* extractAFPRates(html, new Date(year, month - 1, 1));

    // Step 5: Validate extracted data
    const validated = yield* validateAFPRates(rates);

    return validated;
  });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Validates year and month parameters
 */
function validateDateParameters(
  year: number,
  month: number
): Effect.Effect<void, ValidationError, never> {
  const errors: Array<{ path: string; message: string }> = [];

  const maxYear = new Date().getFullYear() + 1;
  if (year < 2004 || year > maxYear) {
    errors.push({
      path: "year",
      message: `El año debe estar entre 2004 y ${maxYear}, recibido: ${year}`,
    });
  }

  if (month < 1 || month > 12) {
    errors.push({
      path: "month",
      message: `El mes debe estar entre 1 y 12, recibido: ${month}`,
    });
  }

  if (errors.length > 0) {
    return Effect.fail(ValidationError.make(errors));
  }

  return Effect.succeed(undefined);
}

/**
 * Builds URL with date parameter in YYYYMM format
 */
function buildURL(year: number, month: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `${AFP_COMMISSION_BASE_URL}?fecha=${year}${monthStr}`;
}

/**
 * Fetches HTML from the AFP commission website
 */
function fetchHTML(url: string): Effect.Effect<string, NetworkError, never> {
  return Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "EmissoPayroll/1.0",
            "Accept-Language": "es-CL,es;q=0.9",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    catch: (error) => NetworkError.make(url, error),
  });
}

/**
 * Parses Chilean decimal format (comma as decimal separator) to number
 * Examples: "1,44" -> 1.44, "0,51" -> 0.51
 */
function parseChileanDecimal(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '.');
  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Normalizes AFP provider name
 * Removes "AFP" prefix and converts to uppercase
 */
function normalizeAFPName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/^AFP\s+/i, '');
}

/**
 * Extracts AFP rates from HTML using cheerio
 */
function extractAFPRates(
  html: string,
  effectiveDate: Date
): Effect.Effect<AFPRate[], ScrapingError | ParseError, never> {
  return Effect.gen(function* () {
    const result = yield* Effect.try({
      try: (): AFPRate[] => {
        const $ = cheerio.load(html);
        const rates: AFPRate[] = [];

        // Find the main table with AFP data
        const table = $('table.table-striped').first();

        if (table.length === 0) {
          throw new Error("No se encontró la tabla de comisiones AFP en el HTML");
        }

        // Find all data rows (skip header rows)
        const rows = table.find('tr').filter((_i, row) => {
          const firstCell = $(row).find('td').first();
          return firstCell.length > 0 && firstCell.text().trim().length > 0;
        });

        if (rows.length === 0) {
          throw new Error("No se encontraron filas de datos en la tabla");
        }

        // Extract data from each row
        rows.each((_i, row) => {
          const cells = $(row).find('td');

          if (cells.length < 2) {
            return;
          }

          const afpName = normalizeAFPName($(cells[0]).text());

          if (!EXPECTED_AFP_PROVIDERS.includes(afpName as typeof EXPECTED_AFP_PROVIDERS[number])) {
            return;
          }

          const commissionText = $(cells[1]).text().trim();
          const commissionRate = parseChileanDecimal(commissionText);

          if (commissionRate === null) {
            throw new Error(
              `No se pudo parsear la tasa de comisión para ${afpName}: "${commissionText}"`
            );
          }

          const sisRate = DEFAULT_SIS_RATE;

          rates.push({
            afpProvider: afpName,
            commissionRate,
            sisRate,
            effectiveDate,
          });
        });

        if (rates.length === 0) {
          throw new Error("No se pudieron extraer datos de AFP de la tabla");
        }

        return rates;
      },
      catch: (error) => {
        if (error instanceof Error) {
          return ScrapingError.make(
            "Error al extraer datos de AFP del HTML",
            error.message
          );
        }
        return ParseError.make(error);
      },
    });

    return result;
  });
}

/**
 * Validates extracted AFP rates against schema
 */
function validateAFPRates(
  rates: AFPRate[]
): Effect.Effect<AFPRate[], ValidationError, never> {
  const result = AFPRatesArraySchema.safeParse(rates);

  if (!result.success) {
    return Effect.fail(ValidationError.fromZodError(result.error));
  }

  // Additional validation: Check we have all expected providers
  const foundProviders = new Set(rates.map(r => r.afpProvider));
  const missingProviders = EXPECTED_AFP_PROVIDERS.filter(
    p => !foundProviders.has(p)
  );

  if (missingProviders.length > 0) {
    return Effect.fail(
      ValidationError.make([{
        path: "afpProviders",
        message: `Faltan datos para los siguientes AFPs: ${missingProviders.join(", ")}`,
      }])
    );
  }

  return Effect.succeed(result.data);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is a ParseError
 */
export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a ScrapingError
 */
export function isScrapingError(error: unknown): error is ScrapingError {
  return error instanceof ScrapingError;
}

/**
 * Helper to get user-friendly error message
 */
export function getErrorMessage(error: AFPScraperError): string {
  return error.message;
}

/**
 * Helper to get detailed error information
 */
export function getErrorDetails(error: AFPScraperError): string {
  if (isValidationError(error)) {
    return error.errors.map(e => `${e.path}: ${e.message}`).join(", ");
  }

  if (isScrapingError(error) && error.details) {
    return error.details;
  }

  if (isNetworkError(error) || isParseError(error)) {
    if (error.cause instanceof Error) {
      return error.cause.message;
    }
  }

  return error.message;
}
