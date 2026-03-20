import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveReferenceData, clearIndicatorCache } from '../src/fetch-indicators.js';
import { DEFAULT_REFERENCE_DATA } from '../src/reference-data.js';

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

describe('resolveReferenceData', () => {
  beforeEach(() => {
    clearIndicatorCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches live UF and UTM, merges with defaults', async () => {
    vi.stubGlobal('fetch', mockFetch({
      uf: { valor: 39000 },
      utm: { valor: 67000 },
    }));

    const result = await resolveReferenceData();

    expect(result.uf).toBe(39000);
    expect(result.utm).toBe(67000);
    expect(result.uta).toBe(67000 * 12);
    expect(result.afpRates).toEqual(DEFAULT_REFERENCE_DATA.afpRates);
    expect(result.taxBrackets).toEqual(DEFAULT_REFERENCE_DATA.taxBrackets);
    expect(result.imm).toBe(DEFAULT_REFERENCE_DATA.imm);
    expect(result.fonasaRate).toBe(DEFAULT_REFERENCE_DATA.fonasaRate);
  });

  it('returns defaults on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await resolveReferenceData();

    expect(result).toEqual(DEFAULT_REFERENCE_DATA);
  });

  it('returns defaults on HTTP error', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false));

    const result = await resolveReferenceData();

    expect(result).toEqual(DEFAULT_REFERENCE_DATA);
  });

  it('returns defaults on invalid response shape', async () => {
    vi.stubGlobal('fetch', mockFetch({ foo: 'bar' }));

    const result = await resolveReferenceData();

    expect(result).toEqual(DEFAULT_REFERENCE_DATA);
  });

  it('returns defaults when values are out of expected range', async () => {
    vi.stubGlobal('fetch', mockFetch({
      uf: { valor: 1.0 },
      utm: { valor: 67000 },
    }));

    const result = await resolveReferenceData();

    expect(result).toEqual(DEFAULT_REFERENCE_DATA);
  });

  it('returns defaults on timeout (AbortError)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    ));

    const result = await resolveReferenceData();

    expect(result).toEqual(DEFAULT_REFERENCE_DATA);
  });

  it('caches result — second call does not re-fetch', async () => {
    const fetchMock = mockFetch({
      uf: { valor: 39000 },
      utm: { valor: 67000 },
    });
    vi.stubGlobal('fetch', fetchMock);

    await resolveReferenceData();
    await resolveReferenceData();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches failure — second call after failure does not retry', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await resolveReferenceData();
    await resolveReferenceData();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clearIndicatorCache forces re-fetch', async () => {
    const fetchMock = mockFetch({
      uf: { valor: 39000 },
      utm: { valor: 67000 },
    });
    vi.stubGlobal('fetch', fetchMock);

    await resolveReferenceData();
    clearIndicatorCache();
    await resolveReferenceData();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('logs warning on fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await resolveReferenceData();

    expect(console.warn).toHaveBeenCalledWith(
      '[emisso-payroll] Failed to fetch live indicators, using defaults:',
      expect.any(Error),
    );
  });
});
