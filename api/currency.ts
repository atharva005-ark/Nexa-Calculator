import {
  ExchangeRateError,
  fetchUpstreamExchangeRates,
  normalizeCurrencyCode,
} from '../src/lib/currency/exchangeRateService.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const base = normalizeCurrencyCode(url.searchParams.get('base'));
    const forceRefresh =
      url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true';

    const payload = await fetchUpstreamExchangeRates(base, {
      timeoutMs: 7000,
      forceRefresh,
    });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': forceRefresh
          ? 'no-store'
          : 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const isRateLimited = err instanceof ExchangeRateError && err.code === 'RATE_LIMITED';
    const message =
      err instanceof ExchangeRateError
        ? err.message
        : 'Live exchange rate service is currently unreachable. Please try again shortly.';
    const code = err instanceof ExchangeRateError ? err.code : 'CURRENCY_UPSTREAM_UNAVAILABLE';

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        code,
      }),
      {
        status: isRateLimited ? 429 : 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
