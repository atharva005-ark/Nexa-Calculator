import crypto from 'node:crypto';

export interface GA4OverviewMetrics {
  totalVisitors: number;
  uniqueVisitors: number;
  todayVisitors: number;
  pageViews: number;
  sessions: number;
}

export interface GA4TimeSeriesPoint {
  label: string;
  rawDate: string;
  visitors: number;
  pageViews: number;
}

export interface GA4FeatureMetric {
  feature: string;
  views: number;
  users: number;
}

export interface GA4DeviceMetric {
  device: string;
  visitors: number;
  sessions: number;
  percentage: number;
}

export interface GA4AnalyticsResponse {
  configured: boolean;
  propertyId?: string;
  fetchedAt: string;
  missingEnvVars?: string[];
  error?: string;
  overview: GA4OverviewMetrics | null;
  dailyVisitors: GA4TimeSeriesPoint[];
  monthlyVisitors: GA4TimeSeriesPoint[];
  popularFeatures: GA4FeatureMetric[];
  deviceBreakdown: GA4DeviceMetric[];
}

interface CachedGoogleAccessToken {
  token: string;
  expiresAt: number;
  clientEmail: string;
}

let cachedToken: CachedGoogleAccessToken | null = null;

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

export function getGA4ConfigStatus(): {
  configured: boolean;
  propertyId: string;
  clientEmail: string;
  privateKey: string;
  missingEnvVars: string[];
} {
  const propertyId = (process.env.GA4_PROPERTY_ID || '').trim();
  const clientEmail = (process.env.GA4_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY || '');

  const missingEnvVars: string[] = [];
  if (!propertyId) missingEnvVars.push('GA4_PROPERTY_ID');
  if (!clientEmail) missingEnvVars.push('GA4_CLIENT_EMAIL');
  if (!privateKey) missingEnvVars.push('GA4_PRIVATE_KEY');

  return {
    configured: missingEnvVars.length === 0,
    propertyId,
    clientEmail,
    privateKey,
    missingEnvVars,
  };
}

async function getGoogleAnalyticsAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Date.now();
  if (
    cachedToken &&
    cachedToken.clientEmail === clientEmail &&
    cachedToken.expiresAt > now + 60_000
  ) {
    return cachedToken.token;
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    })
  );

  const unsignedJwt = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = base64UrlEncode(signer.sign(privateKey));
  const assertion = `${unsignedJwt}.${signature}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      signal: controller.signal,
    });

    const data = (await resp.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    };

    if (!resp.ok || !data.access_token) {
      throw new Error(
        data.error_description ||
          data.error ||
          'Failed to authenticate Google Analytics 4 service account.'
      );
    }

    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
      clientEmail,
    };
    return data.access_token;
  } finally {
    clearTimeout(timer);
  }
}

interface GA4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

interface GA4Report {
  rows?: GA4Row[];
}

function metricNum(row: GA4Row | undefined, index: number): number {
  const val = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(val) ? val : 0;
}

function formatDayLabel(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  const year = yyyymmdd.slice(0, 4);
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const day = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(Number(year), month, day));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatMonthLabel(yyyymm: string): string {
  if (!/^\d{6}$/.test(yyyymm)) return yyyymm;
  const year = Number(yyyymm.slice(0, 4));
  const month = Number(yyyymm.slice(4, 6)) - 1;
  const dt = new Date(Date.UTC(year, month, 1));
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function humanizeFeatureLabel(rawPathOrTitle: string): string {
  const cleaned = rawPathOrTitle.trim();
  const map: Record<string, string> = {
    '/': 'Home Calculator',
    '/home': 'Home Calculator',
    '/scientific': 'Scientific Calculator',
    '/graphs': '2D & 3D Graphing Lab',
    '/equations': 'Equation Solver',
    '/calculus': 'Calculus Lab',
    '/converters': 'Unit & Currency Converters',
    '/finance': 'Financial Suite',
    '/programmer': 'Programmer Mode',
    '/statistics': 'Statistics Lab',
    '/matrix': 'Matrix Algebra',
    '/history': 'Calculation History',
    '/settings': 'Settings',
    '/ai-solver': 'AI Math Solver',
  };
  const lower = cleaned.toLowerCase();
  if (map[lower]) return map[lower];
  return cleaned.replace(/^\/+/, '').replace(/[-_]/g, ' ') || 'Home Calculator';
}

export async function fetchGA4Analytics(): Promise<GA4AnalyticsResponse> {
  const fetchedAt = new Date().toISOString();
  const cfg = getGA4ConfigStatus();

  if (!cfg.configured) {
    return {
      configured: false,
      fetchedAt,
      missingEnvVars: cfg.missingEnvVars,
      overview: null,
      dailyVisitors: [],
      monthlyVisitors: [],
      popularFeatures: [],
      deviceBreakdown: [],
    };
  }

  if (!/^\d+$/.test(cfg.propertyId)) {
    return {
      configured: false,
      fetchedAt,
      error:
        'GA4_PROPERTY_ID must be your numeric Google Analytics 4 Property ID (for example: 123456789), not the G-XXXXXXXX measurement ID.',
      overview: null,
      dailyVisitors: [],
      monthlyVisitors: [],
      popularFeatures: [],
      deviceBreakdown: [],
    };
  }

  try {
    const accessToken = await getGoogleAnalyticsAccessToken(cfg.clientEmail, cfg.privateKey);
    const batchEndpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${cfg.propertyId}:batchRunReports`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    let batch1Reports: GA4Report[] = [];
    let featureReport: GA4Report = {};

    try {
      const [batchResp, featureResp] = await Promise.all([
        fetch(batchEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              // 0: All-time Overview (from 2020-01-01 to today)
              {
                dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'screenPageViews' },
                  { name: 'activeUsers' },
                ],
              },
              // 1: Today's Visitors
              {
                dateRanges: [{ startDate: 'today', endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
              },
              // 2: Daily Visitors (last 30 days)
              {
                dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'date' }],
                metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
                orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
                limit: 31,
              },
              // 3: Monthly Visitors (last 12 months)
              {
                dateRanges: [{ startDate: '365daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'yearMonth' }],
                metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
                orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
                limit: 13,
              },
              // 4: Device Breakdown (last 90 days)
              {
                dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'deviceCategory' }],
                metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
                limit: 10,
              },
            ],
          }),
          signal: controller.signal,
        }),
        fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${cfg.propertyId}:runReport`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
              dimensions: [{ name: 'pagePath' }],
              metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
              orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: 12,
            }),
            signal: controller.signal,
          }
        ),
      ]);

      const batchJson = (await batchResp.json()) as {
        reports?: GA4Report[];
        error?: { message?: string };
      };
      if (!batchResp.ok) {
        throw new Error(
          batchJson.error?.message || `Google Analytics 4 API returned HTTP ${batchResp.status}.`
        );
      }
      batch1Reports = batchJson.reports || [];

      if (featureResp.ok) {
        featureReport = (await featureResp.json()) as GA4Report;
      }
    } finally {
      clearTimeout(timer);
    }

    const overviewRow = batch1Reports[0]?.rows?.[0];
    const todayRow = batch1Reports[1]?.rows?.[0];

    const overview: GA4OverviewMetrics = {
      sessions: metricNum(overviewRow, 0),
      totalVisitors: metricNum(overviewRow, 0),
      uniqueVisitors: metricNum(overviewRow, 1),
      pageViews: metricNum(overviewRow, 2),
      todayVisitors: metricNum(todayRow, 0),
    };

    const dailyVisitors: GA4TimeSeriesPoint[] = (batch1Reports[2]?.rows || []).map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      return {
        rawDate,
        label: formatDayLabel(rawDate),
        visitors: metricNum(row, 0),
        pageViews: metricNum(row, 1),
      };
    });

    const monthlyVisitors: GA4TimeSeriesPoint[] = (batch1Reports[3]?.rows || []).map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      return {
        rawDate,
        label: formatMonthLabel(rawDate),
        visitors: metricNum(row, 0),
        pageViews: metricNum(row, 1),
      };
    });

    const deviceRows = batch1Reports[4]?.rows || [];
    const totalDeviceUsers = deviceRows.reduce((sum, r) => sum + metricNum(r, 0), 0);
    const deviceBreakdown: GA4DeviceMetric[] = deviceRows.map((row) => {
      const rawDevice = row.dimensionValues?.[0]?.value || 'unknown';
      const visitors = metricNum(row, 0);
      const sessions = metricNum(row, 1);
      return {
        device: rawDevice.charAt(0).toUpperCase() + rawDevice.slice(1).toLowerCase(),
        visitors,
        sessions,
        percentage:
          totalDeviceUsers > 0 ? Number(((visitors / totalDeviceUsers) * 100).toFixed(1)) : 0,
      };
    });

    const popularFeatures: GA4FeatureMetric[] = (featureReport.rows || [])
      .filter((row) => {
        const p = (row.dimensionValues?.[0]?.value || '').toLowerCase();
        return !p.startsWith('/admin');
      })
      .map((row) => ({
        feature: humanizeFeatureLabel(row.dimensionValues?.[0]?.value || '/'),
        views: metricNum(row, 0),
        users: metricNum(row, 1),
      }))
      .slice(0, 8);

    return {
      configured: true,
      propertyId: cfg.propertyId,
      fetchedAt,
      overview,
      dailyVisitors,
      monthlyVisitors,
      popularFeatures,
      deviceBreakdown,
    };
  } catch (err) {
    return {
      configured: true,
      propertyId: cfg.propertyId,
      fetchedAt,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to retrieve Google Analytics 4 data.',
      overview: null,
      dailyVisitors: [],
      monthlyVisitors: [],
      popularFeatures: [],
      deviceBreakdown: [],
    };
  }
}
