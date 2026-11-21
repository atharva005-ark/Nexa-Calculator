import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GOOGLE_SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Confirmed primary administrator email (can be extended via server-side ADMIN_EMAILS env var)
const BOOTSTRAPPED_ADMIN_EMAIL = 'katharva637@gmail.com';

interface CachedCerts {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CachedCerts | null = null;
let cachedProjectId: string | null = null;

export interface VerifiedAdminIdentity {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  authorizedVia: 'owner' | 'admin_emails';
}

export class AdminAuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
    this.code = code;
  }
}

const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;

  const envId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (envId) {
    cachedProjectId = envId;
    return envId;
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
      cachedProjectId = parsed.projectId;
      return parsed.projectId;
    }
  } catch {
    // ignore and throw below
  }

  throw new AdminAuthError(
    'Firebase project configuration is missing on the server.',
    500,
    'FIREBASE_CONFIG_MISSING'
  );
}

export function parseAdminEmailsList(rawValue?: string | null): Set<string> {
  const allowed = new Set<string>([BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()]);
  if (!rawValue) return allowed;

  const cleaned = rawValue.trim().replace(/^["']+|["']+$/g, '');
  if (!cleaned) return allowed;

  for (const entry of cleaned.split(/[,;\s]+/)) {
    const normalized = entry.trim().replace(/^["']+|["']+$/g, '').toLowerCase();
    if (normalized && BASIC_EMAIL_PATTERN.test(normalized)) {
      allowed.add(normalized);
    }
  }
  return allowed;
}

function getAllowedAdminEmails(): Set<string> {
  return parseAdminEmailsList(process.env.ADMIN_EMAILS);
}

function base64UrlDecode(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

async function getGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && certCache && certCache.expiresAt > now) {
    return certCache.certs;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const resp = await fetch(GOOGLE_SECURETOKEN_CERTS_URL, {
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new AdminAuthError(
        'Unable to fetch Firebase authentication public certificates.',
        503,
        'AUTH_CERTS_UNAVAILABLE'
      );
    }

    const certs = (await resp.json()) as Record<string, string>;
    const cacheControl = resp.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

    certCache = {
      certs,
      expiresAt: now + Math.max(60, maxAgeSec - 60) * 1000,
    };
    return certs;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyAdminBearerToken(
  authorizationHeader?: string | null
): Promise<VerifiedAdminIdentity> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AdminAuthError(
      'Administrator authentication required.',
      401,
      'ADMIN_AUTH_REQUIRED'
    );
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 8192) {
    throw new AdminAuthError('Invalid authentication token.', 401, 'INVALID_TOKEN');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AdminAuthError('Malformed authentication token.', 401, 'MALFORMED_TOKEN');
  }

  let header: { alg?: string; kid?: string };
  let payload: {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    firebase?: {
      sign_in_provider?: string;
    };
  };

  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8')) as typeof payload;
  } catch {
    throw new AdminAuthError('Malformed authentication token payload.', 401, 'MALFORMED_TOKEN');
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new AdminAuthError('Unsupported authentication token algorithm.', 401, 'UNSUPPORTED_ALG');
  }

  let certs = await getGooglePublicCerts(false);
  let certPem = certs[header.kid];
  if (!certPem) {
    certs = await getGooglePublicCerts(true);
    certPem = certs[header.kid];
  }
  if (!certPem) {
    throw new AdminAuthError('Authentication signing key not recognized.', 401, 'UNKNOWN_KEY');
  }

  const signedContent = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlDecode(parts[2]);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signedContent);
  verifier.end();

  const signatureValid = verifier.verify(certPem, signature);
  if (!signatureValid) {
    throw new AdminAuthError('Invalid authentication signature.', 401, 'INVALID_SIGNATURE');
  }

  const projectId = getFirebaseProjectId();
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new AdminAuthError('Authentication token audience mismatch.', 401, 'INVALID_AUDIENCE');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new AdminAuthError('Authentication token issuer mismatch.', 401, 'INVALID_ISSUER');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new AdminAuthError('Authentication token subject missing.', 401, 'INVALID_SUBJECT');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new AdminAuthError('Administrator session expired. Please sign in again.', 401, 'TOKEN_EXPIRED');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new AdminAuthError('Authentication token issued-at time is invalid.', 401, 'INVALID_IAT');
  }

  if (
    payload.firebase?.sign_in_provider !== 'google.com' ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string'
  ) {
    throw new AdminAuthError(
      'A verified Google administrator account is required.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const allowedAdmins = getAllowedAdminEmails();
  if (!allowedAdmins.has(normalizedEmail)) {
    throw new AdminAuthError(
      'Access denied. This account does not have administrator privileges.',
      403,
      'ADMIN_FORBIDDEN'
    );
  }

  return {
    uid: payload.sub,
    email: normalizedEmail,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    authorizedVia:
      normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() ? 'owner' : 'admin_emails',
  };
}
