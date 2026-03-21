/**
 * Lightweight indicator fetcher for auto-resolving reference data.
 *
 * Uses plain fetch + zod (no Effect dependency) so it stays in the
 * main bundle and works in Deno / Edge Functions.
 *
 * Cache behavior: results (including fallback on failure) are cached
 * for the process lifetime. In serverless environments, cache may reset
 * on cold starts. Call clearIndicatorCache() to force a re-fetch.
 */

import { z } from 'zod';
import { DEFAULT_REFERENCE_DATA } from './reference-data.js';
import type { ReferenceData } from './types.js';

const ResponseSchema = z.object({
  uf: z.object({ valor: z.number().min(30_000).max(60_000) }),
  utm: z.object({ valor: z.number().min(50_000).max(120_000) }),
});

const MINDICADOR_API_URL = 'https://mindicador.cl/api';

let cachedData: ReferenceData | null = null;
let inflightPromise: Promise<ReferenceData> | null = null;

/**
 * Fetches live UF + UTM from mindicador.cl, merges with DEFAULT_REFERENCE_DATA,
 * and caches for the process lifetime.
 *
 * Returns DEFAULT_REFERENCE_DATA on any failure (network, timeout, bad response).
 * Concurrent calls share a single in-flight request.
 */
export async function resolveReferenceData(): Promise<ReferenceData> {
  if (cachedData) return cachedData;
  if (inflightPromise) return inflightPromise;
  inflightPromise = doFetch();
  return inflightPromise;
}

async function doFetch(): Promise<ReferenceData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(MINDICADOR_API_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'EmissoPayroll/1.0' },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const parsed = ResponseSchema.parse(json);

    cachedData = {
      ...DEFAULT_REFERENCE_DATA,
      uf: parsed.uf.valor,
      utm: parsed.utm.valor,
      uta: parsed.utm.valor * 12,
    };
    return cachedData;
  } catch (err) {
    console.warn('[emisso-payroll] Failed to fetch live indicators, using defaults:', err);
    cachedData = DEFAULT_REFERENCE_DATA;
    return DEFAULT_REFERENCE_DATA;
  } finally {
    clearTimeout(timeoutId);
    inflightPromise = null;
  }
}

/** Clear the cached reference data (useful for testing). */
export function clearIndicatorCache(): void {
  cachedData = null;
  inflightPromise = null;
}
