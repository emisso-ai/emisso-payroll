/**
 * Node-only providers
 *
 * These providers depend on cheerio (which uses Node.js-only APIs via iconv-lite)
 * and cannot run in Deno or browser environments.
 *
 * For Deno/Edge Functions, use "@emisso/payroll/providers" instead.
 */
export { fetchAFPRates } from './providers/afp-scraper.js';
export type { AFPRate, AFPScraperError } from './providers/afp-scraper.js';
