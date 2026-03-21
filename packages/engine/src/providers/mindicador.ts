/**
 * Mindicador.cl API fetcher
 *
 * Fetches current economic indicators (UF, UTM) from the official Chilean API.
 * Uses Effect-ts for error handling and Zod for runtime validation.
 *
 * API Documentation: https://mindicador.cl/
 */

import { Effect, Data } from "effect";
import { z } from "zod";

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
 * Parse error - failed to parse JSON response
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly _type: "ParseError";
  readonly message: string;
  readonly cause?: unknown;
}> {
  static make(cause?: unknown): ParseError {
    const message = cause instanceof Error
      ? `Error al parsear respuesta JSON: ${cause.message}`
      : "Error al parsear respuesta JSON";

    return new ParseError({
      _type: "ParseError",
      message,
      cause,
    });
  }
}

/**
 * Validation error - response doesn't match expected schema
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly _type: "ValidationError";
  readonly message: string;
  readonly errors: Array<{ path: string; message: string }>;
}> {
  static make(errors: Array<{ path: string; message: string }>): ValidationError {
    return new ValidationError({
      _type: "ValidationError",
      message: "La respuesta del API no cumple con el formato esperado",
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
 * Union of all fetcher errors
 */
export type MindicadorFetchError = NetworkError | ParseError | ValidationError;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Economic indicators returned by fetchCurrentIndicators
 */
export interface EconomicIndicators {
  /** UF value in CLP */
  uf: number;
  /** UTM value in CLP */
  utm: number;
  /** Date when the data was fetched */
  fetchDate: Date;
}

/**
 * Indicator value from API
 */
const IndicatorValueSchema = z.object({
  valor: z.number({
    required_error: "El campo 'valor' es requerido",
    invalid_type_error: "El campo 'valor' debe ser un número",
  }).positive("El valor debe ser positivo"),
});

/**
 * Full API response schema
 */
const MindicadorResponseSchema = z.object({
  uf: IndicatorValueSchema,
  utm: IndicatorValueSchema,
});

type MindicadorResponse = z.infer<typeof MindicadorResponseSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const MINDICADOR_API_URL = "https://mindicador.cl/api";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetches current UF and UTM values from mindicador.cl API
 *
 * @returns Effect that resolves to economic indicators or fails with typed error
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { fetchCurrentIndicators } from "@emisso/payroll-cl/providers";
 *
 * const program = Effect.gen(function* () {
 *   const indicators = yield* fetchCurrentIndicators();
 *   console.log(`UF: $${indicators.uf}, UTM: $${indicators.utm}`);
 *   return indicators;
 * });
 *
 * Effect.runPromise(program)
 *   .then(data => console.log("Success:", data))
 *   .catch(error => console.error("Error:", error));
 * ```
 */
export function fetchCurrentIndicators(): Effect.Effect<
  EconomicIndicators,
  MindicadorFetchError,
  never
> {
  return Effect.gen(function* () {
    // Step 1: Fetch from API
    const response = yield* fetchFromAPI();

    // Step 2: Parse JSON
    const json = yield* parseJSON(response);

    // Step 3: Validate schema
    const validated = yield* validateResponse(json);

    // Step 4: Transform to our format
    return {
      uf: validated.uf.valor,
      utm: validated.utm.valor,
      fetchDate: new Date(),
    };
  });
}

/**
 * Fetches UF and UTM values for a specific month from mindicador.cl API.
 * Uses the last day of the month to get the most representative value.
 *
 * @param year - e.g., 2026
 * @param month - 1-12, e.g., 2 for febrero
 * @returns Effect that resolves to economic indicators or fails with typed error
 *
 * Note: requesting the current in-progress month may fail if the last day
 * hasn't occurred yet and mindicador.cl has no data for that date.
 * For current-month calculations, use fetchCurrentIndicators() instead.
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { fetchIndicatorsForPeriod } from "@emisso/payroll-cl/providers";
 *
 * const program = Effect.gen(function* () {
 *   const indicators = yield* fetchIndicatorsForPeriod(2026, 2);
 *   console.log(`UF feb 2026: $${indicators.uf}, UTM: $${indicators.utm}`);
 *   return indicators;
 * });
 *
 * Effect.runPromise(program)
 *   .then(data => console.log("Success:", data))
 *   .catch(error => console.error("Error:", error));
 * ```
 */
export function fetchIndicatorsForPeriod(
  year: number,
  month: number
): Effect.Effect<EconomicIndicators, MindicadorFetchError, never> {
  return Effect.gen(function* () {
    // Validate inputs
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return yield* Effect.fail(
        ValidationError.make([{
          path: "month",
          message: `El mes debe ser un entero entre 1 y 12, recibido: ${month}`,
        }])
      );
    }

    if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      return yield* Effect.fail(
        ValidationError.make([{
          path: "year",
          message: `El año debe ser un entero entre 1990 y ${new Date().getFullYear() + 1}, recibido: ${year}`,
        }])
      );
    }

    // Check for future periods
    const lastDay = new Date(year, month, 0);
    if (lastDay > new Date()) {
      return yield* Effect.fail(
        ValidationError.make([{
          path: "period",
          message: `El periodo solicitado (${String(month).padStart(2, "0")}/${year}) aún no ha ocurrido`,
        }])
      );
    }

    const dd = String(lastDay.getDate()).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const dateStr = `${dd}-${mm}-${year}`;

    // Fetch UF and UTM in parallel
    const [ufResponse, utmResponse] = yield* Effect.all([
      fetchFromURL(`${MINDICADOR_API_URL}/uf/${dateStr}`),
      fetchFromURL(`${MINDICADOR_API_URL}/utm/${dateStr}`),
    ], { concurrency: 2 });

    // Parse JSON
    const [ufJson, utmJson] = yield* Effect.all([
      parseJSON(ufResponse),
      parseJSON(utmResponse),
    ], { concurrency: 2 });

    // Extract values from serie array (rounded to integer CLP)
    const ufValue = Math.round(yield* extractSerieValue(ufJson, "uf"));
    const utmValue = Math.round(yield* extractSerieValue(utmJson, "utm"));

    return {
      uf: ufValue,
      utm: utmValue,
      fetchDate: lastDay,
    };
  });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Fetches raw response from mindicador.cl base API
 */
function fetchFromAPI(): Effect.Effect<Response, NetworkError, never> {
  return fetchFromURL(MINDICADOR_API_URL);
}

/**
 * Parses JSON from response
 */
function parseJSON(response: Response): Effect.Effect<unknown, ParseError, never> {
  return Effect.tryPromise({
    try: () => response.json(),
    catch: (error) => ParseError.make(error),
  });
}

/**
 * Validates response against Zod schema
 */
function validateResponse(data: unknown): Effect.Effect<MindicadorResponse, ValidationError, never> {
  const result = MindicadorResponseSchema.safeParse(data);

  if (!result.success) {
    return Effect.fail(ValidationError.fromZodError(result.error));
  }

  return Effect.succeed(result.data);
}

/**
 * Fetches a raw response from any URL (used for per-indicator endpoints)
 */
function fetchFromURL(url: string): Effect.Effect<Response, NetworkError, never> {
  return Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "EmissoPayroll/1.0",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    catch: (error) => NetworkError.make(url, error),
  }).pipe(
    Effect.flatMap((response) => {
      if (!response.ok) {
        return Effect.fail(
          NetworkError.make(
            url,
            new Error(`HTTP ${response.status}: ${response.statusText}`)
          )
        );
      }
      return Effect.succeed(response);
    })
  );
}

/**
 * Schema for per-indicator endpoint responses
 * mindicador.cl returns: { serie: [{ valor: number, fecha: string }] }
 */
const SerieResponseSchema = z.object({
  serie: z.array(z.object({
    valor: z.number().positive(),
  })).min(1, "No se encontraron datos en la serie"),
});

/**
 * Extracts the first value from a mindicador.cl serie response
 */
function extractSerieValue(
  data: unknown,
  indicatorName: string
): Effect.Effect<number, ValidationError, never> {
  const result = SerieResponseSchema.safeParse(data);

  if (!result.success) {
    return Effect.fail(
      ValidationError.make([{
        path: indicatorName,
        message: `No se pudo extraer el valor de ${indicatorName}: ${result.error.message}`,
      }])
    );
  }

  return Effect.succeed(result.data.serie[0].valor);
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
 * Helper to get user-friendly error message
 */
export function getErrorMessage(error: MindicadorFetchError): string {
  return error.message;
}
