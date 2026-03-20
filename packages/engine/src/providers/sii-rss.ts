/**
 * SII RSS feed fetcher
 *
 * Fetches current economic indicators (UF, UTM, UTA) from the SII RSS feed as a fallback source.
 * Uses Effect-ts for error handling and fast-xml-parser for XML parsing.
 *
 * Feed URL: https://zeus.sii.cl/admin/rss/sii_ind_rss.xml
 */

import { Effect, Data } from "effect";
import { XMLParser } from "fast-xml-parser";

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Network error - failed to fetch from RSS feed
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
 * Parse error - failed to parse XML response
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly _type: "ParseError";
  readonly message: string;
  readonly cause?: unknown;
}> {
  static make(cause?: unknown): ParseError {
    const message = cause instanceof Error
      ? `Error al parsear respuesta XML: ${cause.message}`
      : "Error al parsear respuesta XML";

    return new ParseError({
      _type: "ParseError",
      message,
      cause,
    });
  }
}

/**
 * Validation error - response doesn't match expected structure
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly _type: "ValidationError";
  readonly message: string;
  readonly errors: Array<{ path: string; message: string }>;
}> {
  static make(errors: Array<{ path: string; message: string }>): ValidationError {
    return new ValidationError({
      _type: "ValidationError",
      message: "La respuesta del RSS no cumple con el formato esperado",
      errors,
    });
  }
}

/**
 * Union of all fetcher errors
 */
export type SIIFetchError = NetworkError | ParseError | ValidationError;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Economic indicators returned by fetchIndicatorsFromSII
 */
export interface EconomicIndicators {
  /** UF value in CLP */
  uf: number;
  /** UTM value in CLP */
  utm: number;
  /** UTA value in CLP */
  uta: number;
  /** Date when the data was fetched */
  fetchDate: Date;
}

/**
 * RSS item structure from SII feed
 */
interface RSSItem {
  title: string;
  description: string;
}

/**
 * Parsed RSS feed structure
 */
interface RSSFeed {
  rss?: {
    channel?: {
      item?: RSSItem | RSSItem[];
    };
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SII_RSS_URL = "https://zeus.sii.cl/admin/rss/sii_ind_rss.xml";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetches current UF, UTM, and UTA values from SII RSS feed
 *
 * @returns Effect that resolves to economic indicators or fails with typed error
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { fetchIndicatorsFromSII } from "@emisso/payroll-cl/providers";
 *
 * const program = Effect.gen(function* () {
 *   const indicators = yield* fetchIndicatorsFromSII();
 *   console.log(`UF: $${indicators.uf}, UTM: $${indicators.utm}, UTA: $${indicators.uta}`);
 *   return indicators;
 * });
 *
 * Effect.runPromise(program)
 *   .then(data => console.log("Success:", data))
 *   .catch(error => console.error("Error:", error));
 * ```
 */
export function fetchIndicatorsFromSII(): Effect.Effect<
  EconomicIndicators,
  SIIFetchError,
  never
> {
  return Effect.gen(function* () {
    // Step 1: Fetch from RSS feed
    const response = yield* fetchFromRSS();

    // Step 2: Parse XML
    const parsed = yield* parseXML(response);

    // Step 3: Extract and validate indicators
    const indicators = yield* extractIndicators(parsed);

    // Step 4: Return formatted result
    return {
      ...indicators,
      fetchDate: new Date(),
    };
  });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Fetches raw response from SII RSS feed
 */
function fetchFromRSS(): Effect.Effect<string, NetworkError, never> {
  return Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(SII_RSS_URL, {
          method: "GET",
          headers: {
            "Accept": "application/xml, text/xml",
            "User-Agent": "EmissoPayroll/1.0",
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
    catch: (error) => NetworkError.make(SII_RSS_URL, error),
  });
}

/**
 * Parses XML string to JSON object
 */
function parseXML(xmlString: string): Effect.Effect<RSSFeed, ParseError, never> {
  return Effect.try({
    try: () => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        parseAttributeValue: false,
        parseTagValue: false,
        trimValues: true,
      });

      const parsed = parser.parse(xmlString);
      return parsed as RSSFeed;
    },
    catch: (error) => ParseError.make(error),
  });
}

/**
 * Extracts UF, UTM, and UTA values from parsed RSS feed
 */
function extractIndicators(
  feed: RSSFeed
): Effect.Effect<{ uf: number; utm: number; uta: number }, ValidationError, never> {
  try {
    // Validate RSS structure
    if (!feed.rss?.channel?.item) {
      return Effect.fail(
        ValidationError.make([
          { path: "feed", message: "Estructura RSS inválida: no se encontró channel.item" }
        ])
      );
    }

    // Normalize items to array
    const items = Array.isArray(feed.rss.channel.item)
      ? feed.rss.channel.item
      : [feed.rss.channel.item];

    // Extract indicators
    const indicators: Record<string, number> = {};

    for (const item of items) {
      if (!item.title || !item.description) {
        continue;
      }

      const title = item.title.toUpperCase().trim();
      const description = item.description.trim();

      try {
        if (title.includes("UF")) {
          indicators.uf = parseChileanNumber(description);
        } else if (title.includes("UTM")) {
          indicators.utm = parseChileanNumber(description);
        } else if (title.includes("UTA")) {
          indicators.uta = parseChileanNumber(description);
        }
      } catch {
        // Continue on parse errors, we'll validate completeness below
        continue;
      }
    }

    // Validate all required indicators are present
    const errors: Array<{ path: string; message: string }> = [];

    if (indicators.uf === undefined) {
      errors.push({ path: "uf", message: "No se encontró valor UF en el feed" });
    } else if (!isPositiveNumber(indicators.uf)) {
      errors.push({ path: "uf", message: "Valor UF debe ser un número positivo" });
    }

    if (indicators.utm === undefined) {
      errors.push({ path: "utm", message: "No se encontró valor UTM en el feed" });
    } else if (!isPositiveNumber(indicators.utm)) {
      errors.push({ path: "utm", message: "Valor UTM debe ser un número positivo" });
    }

    if (indicators.uta === undefined) {
      errors.push({ path: "uta", message: "No se encontró valor UTA en el feed" });
    } else if (!isPositiveNumber(indicators.uta)) {
      errors.push({ path: "uta", message: "Valor UTA debe ser un número positivo" });
    }

    if (errors.length > 0) {
      return Effect.fail(ValidationError.make(errors));
    }

    return Effect.succeed({
      uf: indicators.uf,
      utm: indicators.utm,
      uta: indicators.uta,
    });
  } catch (error) {
    return Effect.fail(
      ValidationError.make([
        { path: "feed", message: error instanceof Error ? error.message : "Error desconocido" }
      ])
    );
  }
}

/**
 * Parses Chilean number format to JavaScript number
 *
 * Chilean format:
 * - Period (.) for thousands separator
 * - Comma (,) for decimal separator
 *
 * Examples:
 * - "1.234.567,89" → 1234567.89
 * - "38.500,12" → 38500.12
 * - "65.967" → 65967.00
 */
function parseChileanNumber(value: string): number {
  const normalized = value
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed)) {
    throw new Error(`No se pudo parsear el número: "${value}"`);
  }

  return parsed;
}

/**
 * Validates that a number is positive and finite
 */
function isPositiveNumber(value: number): boolean {
  return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value) && value > 0;
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
export function getErrorMessage(error: SIIFetchError): string {
  return error.message;
}
