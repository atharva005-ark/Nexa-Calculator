import { AdminAuthError, verifyAdminBearerToken } from '../../src/lib/admin/adminAuth.ts';
import { fetchGA4Analytics } from '../../src/lib/analytics/ga4Server.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    await verifyAdminBearerToken(request.headers.get('authorization'));
  } catch (err) {
    const status = err instanceof AdminAuthError ? err.status : 401;
    const code = err instanceof AdminAuthError ? err.code : 'ADMIN_AUTH_FAILED';
    const message =
      err instanceof AdminAuthError ? err.message : 'Administrator authentication required.';

    return new Response(
      JSON.stringify({
        success: false,
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

  const analytics = await fetchGA4Analytics();
  return new Response(JSON.stringify(analytics), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
