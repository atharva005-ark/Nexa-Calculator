export interface ExchangeRatePayload {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
  provider: string;
  isLive: boolean;
}

export type ExchangeRateErrorCode =
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'UPSTREAM_UNAVAILABLE';

export class ExchangeRateError extends Error {
  code: ExchangeRateErrorCode;

  constructor(message: string, code: ExchangeRateErrorCode) {
    super(message);
    this.name = 'ExchangeRateError';
    this.code = code;
  }
}

export function normalizeCurrencyCode(input?: string | null): string {
  const cleaned = typeof input === 'string' ? input.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(cleaned) ? cleaned : 'USD';
}

function sanitizeRatesMap(
  rawRates: unknown,
  base: string
): Record<string, number> | null {
  if (!rawRates || typeof rawRates !== 'object' || Array.isArray(rawRates)) {
    return null;
  }

  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawRates as Record<string, unknown>)) {
    const code = key.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code) && typeof val === 'number' && Number.isFinite(val) && val > 0) {
      normalized[code] = val;
    }
  }

  if (Object.keys(normalized).length === 0) {
    return null;
  }

  normalized[base] = 1;
  return normalized;
}

async function parseJsonSafely(resp: Response): Promise<unknown | null> {
  const contentType = (resp.headers.get('content-type') || '').toLowerCase();
  const text = await resp.text();
  const trimmed = text.trim();

  if (!trimmed) return null;
  // Reject HTML pages (e.g., SPA fallback index.html or proxy error pages) before JSON.parse
  if (trimmed.startsWith('<') || contentType.includes('text/html')) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  forceRefresh = false
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: forceRefresh ? 'no-store' : 'default',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

interface ProviderDefinition {
  name: string;
  buildUrl: (base: string, forceRefresh: boolean) => string;
  parse: (data: unknown, base: string) => ExchangeRatePayload | null;
}

const UPSTREAM_PROVIDERS: ProviderDefinition[] = [
  {
    name: 'ExchangeRate-API (Open Access)',
    buildUrl: (base, forceRefresh) => {
      const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
      return forceRefresh ? `${url}?_t=${Date.now()}` : url;
    },
    parse: (data, base) => {
      if (!data || typeof data !== 'object') return null;
      const obj = data as {
        result?: string;
        base_code?: string;
        time_last_update_utc?: string;
        rates?: unknown;
      };
      if (obj.result !== 'success') return null;
      const resolvedBase = normalizeCurrencyCode(obj.base_code || base);
      const rates = sanitizeRatesMap(obj.rates, resolvedBase);
      if (!rates) return null;
      return {
        base: resolvedBase,
        rates,
        timestamp: obj.time_last_update_utc || new Date().toUTCString(),
        provider: 'ExchangeRate-API (Open Access)',
        isLive: true,
      };
    },
  },
  {
    name: 'Fawaz Currency API (jsDelivr CDN)',
    buildUrl: (base, forceRefresh) => {
      const lower = base.toLowerCase();
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${encodeURIComponent(
        lower
      )}.json`;
      return forceRefresh ? `${url}?_t=${Date.now()}` : url;
    },
    parse: (data, base) => {
      if (!data || typeof data !== 'object') return null;
      const obj = data as Record<string, unknown>;
      const lower = base.toLowerCase();
      const rates = sanitizeRatesMap(obj[lower], base);
      if (!rates) return null;
      const dateStr = typeof obj.date === 'string' && obj.date.trim() ? obj.date.trim() : null;
      return {
        base,
        rates,
        timestamp: dateStr ? `${dateStr} (Daily Global Rate)` : new Date().toUTCString(),
        provider: 'Global Currency API (jsDelivr CDN)',
        isLive: true,
      };
    },
  },
  {
    name: 'Fawaz Currency API (Cloudflare Mirror)',
    buildUrl: (base, forceRefresh) => {
      const lower = base.toLowerCase();
      const url = `https://latest.currency-api.pages.dev/v1/currencies/${encodeURIComponent(
        lower
      )}.json`;
      return forceRefresh ? `${url}?_t=${Date.now()}` : url;
    },
    parse: (data, base) => {
      if (!data || typeof data !== 'object') return null;
      const obj = data as Record<string, unknown>;
      const lower = base.toLowerCase();
      const rates = sanitizeRatesMap(obj[lower], base);
      if (!rates) return null;
      const dateStr = typeof obj.date === 'string' && obj.date.trim() ? obj.date.trim() : null;
      return {
        base,
        rates,
        timestamp: dateStr ? `${dateStr} (Daily Global Rate)` : new Date().toUTCString(),
        provider: 'Global Currency API (Cloudflare)',
        isLive: true,
      };
    },
  },
  {
    name: 'Frankfurter (European Central Bank)',
    buildUrl: (base) => `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`,
    parse: (data, base) => {
      if (!data || typeof data !== 'object') return null;
      const obj = data as { base?: string; date?: string; rates?: unknown };
      const resolvedBase = normalizeCurrencyCode(obj.base || base);
      const rates = sanitizeRatesMap(obj.rates, resolvedBase);
      if (!rates) return null;
      return {
        base: resolvedBase,
        rates,
        timestamp: obj.date ? `${obj.date} (ECB Daily Reference)` : new Date().toUTCString(),
        provider: 'Frankfurter (European Central Bank)',
        isLive: true,
      };
    },
  },
];

export async function fetchUpstreamExchangeRates(
  rawBase: string,
  options?: { timeoutMs?: number; forceRefresh?: boolean }
): Promise<ExchangeRatePayload> {
  const base = normalizeCurrencyCode(rawBase);
  const timeoutMs = options?.timeoutMs ?? 7000;
  const forceRefresh = options?.forceRefresh ?? false;

  let sawRateLimit = false;
  let sawNetworkError = false;

  for (const provider of UPSTREAM_PROVIDERS) {
    try {
      const resp = await fetchWithTimeout(provider.buildUrl(base, forceRefresh), timeoutMs, forceRefresh);
      if (resp.status === 429) {
        sawRateLimit = true;
        continue;
      }
      if (!resp.ok) {
        continue;
      }

      const parsedJson = await parseJsonSafely(resp);
      if (!parsedJson) {
        continue;
      }

      const normalized = provider.parse(parsedJson, base);
      if (normalized) {
        return normalized;
      }
    } catch {
      sawNetworkError = true;
    }
  }

  if (sawRateLimit) {
    throw new ExchangeRateError(
      'Exchange rate service rate limit reached. Please wait a moment and tap Refresh Rate.',
      'RATE_LIMITED'
    );
  }

  if (sawNetworkError) {
    throw new ExchangeRateError(
      'Unable to reach the live exchange rate service. Please check your internet connection and try again.',
      'NETWORK_ERROR'
    );
  }

  throw new ExchangeRateError(
    'Live exchange rate service is temporarily unavailable. Please try again in a moment.',
    'UPSTREAM_UNAVAILABLE'
  );
}

/**
 * Browser-safe exchange rate fetcher:
 * 1. Tries the app backend (/api/currency) first (works in AI Studio Express server & Vercel Serverless Functions).
 * 2. If /api/currency returns HTML (static SPA fallback), 404, 5xx, or non-JSON, seamlessly falls back to
 *    CORS-enabled public exchange-rate APIs directly so currency conversion works in every deployment environment.
 */
export async function fetchClientExchangeRates(
  rawBase: string,
  options?: { forceRefresh?: boolean; timeoutMs?: number }
): Promise<ExchangeRatePayload> {
  const base = normalizeCurrencyCode(rawBase);
  const forceRefresh = options?.forceRefresh ?? false;
  const timeoutMs = options?.timeoutMs ?? 7000;

  try {
    const query = new URLSearchParams({ base });
    if (forceRefresh) {
      query.set('refresh', '1');
      query.set('_t', String(Date.now()));
    }

    const resp = await fetchWithTimeout(`/api/currency?${query.toString()}`, timeoutMs, forceRefresh);
    if (resp.ok) {
      const parsed = await parseJsonSafely(resp);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as {
          base?: string;
          rates?: unknown;
          timestamp?: string;
          provider?: string;
        };
        const resolvedBase = normalizeCurrencyCode(obj.base || base);
        const rates = sanitizeRatesMap(obj.rates, resolvedBase);
        if (rates) {
          return {
            base: resolvedBase,
            rates,
            timestamp:
              typeof obj.timestamp === 'string' && obj.timestamp.trim()
                ? obj.timestamp
                : new Date().toUTCString(),
            provider:
              typeof obj.provider === 'string' && obj.provider.trim()
                ? obj.provider
                : 'Live Exchange Rate API',
            isLive: true,
          };
        }
      }
    }
  } catch {
    // Fall through to direct CORS-enabled public exchange-rate providers
  }

  return fetchUpstreamExchangeRates(base, { timeoutMs, forceRefresh });
}
