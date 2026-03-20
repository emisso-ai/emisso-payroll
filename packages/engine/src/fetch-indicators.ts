/**
 * Lightweight indicator fetcher for auto-resolving reference data.
 *
 * Uses plain fetch + zod (no Effect dependency) so it stays in the
 * main bundle and works in Deno / Edge Functions.
 */

import { z } from 'zod';
import { DEFAULT_REFERENCE_DATA } from './reference-data.js';
import type { ReferenceData } from './types.js';

const ResponseSchema = z.object({
  uf: z.object({ valor: z.number().positive() }),
  utm: z.object({ valor: z.number().positive() }),
});

const MINDICADOR_API_URL = 'https://mindicador.cl/api';

let cachedData: ReferenceData | null = null;

/**
 * Fetches live UF + UTM from mindicador.cl, merges with DEFAULT_REFERENCE_DATA,
 * and caches for the process lifetime.
 *
 * Returns DEFAULT_REFERENCE_DATA on any failure (network, timeout, bad response).
 */
export async function resolveReferenceData(): Promise<ReferenceData> {
  if (cachedData) return cachedData;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(MINDICADOR_API_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'EmissoPayroll/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
  } catch {
    return DEFAULT_REFERENCE_DATA;
  }
}

/** Clear the cached reference data (useful for testing). */
export function clearIndicatorCache(): void {
  cachedData = null;
}
