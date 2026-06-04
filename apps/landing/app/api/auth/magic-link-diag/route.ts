// Diagnóstico de la configuración de email/Firebase usada por el flujo
// de magic link. Solo accesible vía Bearer CRON_SECRET (no público).
//
// Útil cuando el endpoint /api/auth/magic-link devuelve 502 y no
// sabemos si la causa es Resend, Firebase Admin, o un from no
// verificado. Sin filtrar secretos.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  return token === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 1) Firebase Admin
  const firebase = {
    projectId: !!(process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
    clientEmail: !!(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL),
    privateKey: !!(process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY),
  };

  // 2) Resend — tenemos API key?
  const resendApiKeyPresent = !!process.env.RESEND_API_KEY?.trim();

  // 3) Qué 'from' resuelve el magic link
  const resolvedFrom =
    (
      process.env.RESEND_FROM_ISAAK ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM
    )?.trim() || 'Isaak <noreply@verifactu.business>';

  // 4) Verificar dominios en Resend (extrae dominio del 'from')
  let resendDomains: { ok: boolean; domains?: Array<{ name: string; status: string }>; error?: string } = {
    ok: false,
  };
  if (resendApiKeyPresent) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ name: string; status: string }> };
        resendDomains = {
          ok: true,
          domains: data.data?.map((d) => ({ name: d.name, status: d.status })) ?? [],
        };
      } else {
        resendDomains = { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
    } catch (err) {
      resendDomains = { ok: false, error: err instanceof Error ? err.message : 'fetch_failed' };
    }
  }

  // Extracción del dominio del from para que el admin sepa cuál mirar
  const fromMatch = resolvedFrom.match(/<[^@]+@([^>]+)>/) ?? resolvedFrom.match(/@(.+)$/);
  const fromDomain = fromMatch ? fromMatch[1] : null;
  const fromDomainVerified =
    resendDomains.domains?.find((d) => d.name === fromDomain)?.status ?? 'not_found_in_resend';

  return NextResponse.json({
    firebase,
    resend: {
      apiKeyPresent: resendApiKeyPresent,
      resolvedFrom,
      fromDomain,
      fromDomainStatus: fromDomainVerified,
      allDomains: resendDomains,
    },
    allowedContinueOrigins: [
      'isaak.app',
      'www.isaak.app',
      'isaak.chat',
      'www.isaak.chat',
      'verifactu.business',
      'isaak.verifactu.business',
      'app.verifactu.business',
    ],
    diagnosis:
      !firebase.projectId || !firebase.clientEmail || !firebase.privateKey
        ? 'Firebase Admin no configurado completamente — magic link fallará al generar el enlace'
        : !resendApiKeyPresent
          ? 'RESEND_API_KEY no configurada — el envío del email no funciona'
          : fromDomainVerified !== 'verified'
            ? `Dominio del 'from' (${fromDomain}) no está verificado en Resend (status=${fromDomainVerified}). Resend rechazará con 403.`
            : 'OK — config parece correcta',
  });
}
