import { AdminAuthError, verifyAdminBearerToken } from '../../src/lib/admin/adminAuth.ts';
import { getGA4ConfigStatus } from '../../src/lib/analytics/ga4Server.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await verifyAdminBearerToken(request.headers.get('authorization'));
    const ga4 = getGA4ConfigStatus();

    return new Response(
      JSON.stringify({
        authenticated: true,
        admin,
        ga4Configured: ga4.configured,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    const status = err instanceof AdminAuthError ? err.status : 401;
    const code = err instanceof AdminAuthError ? err.code : 'ADMIN_AUTH_FAILED';
    const message =
      err instanceof AdminAuthError ? err.message : 'Administrator authentication required.';

    return new Response(
      JSON.stringify({
        authenticated: false,
        error: message,
        code,
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
