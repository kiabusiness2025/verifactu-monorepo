/**
 * /auth/holded-direct — F2.1 (rediseño auth 2026-05-08)
 *
 * Server component que comprueba si ya hay una sesion valida (cookie
 * SESSION_COOKIE_NAME firmada). Si la hay, pasa `sessionEmail` al form
 * cliente y salta el paso de autentificacion directamente a la API key.
 *
 * Si no hay sesion, el form cliente muestra el paso de acceso:
 *   - Continuar con Google (Firebase redirect)
 *   - Continuar con correo (Firebase magic link)
 *
 * En ambos casos, tras el auth el form muestra el input de API key de Holded.
 * El backend /api/auth/holded-direct lee el email de la session cookie —
 * ya no depende de holded_email_verified.
 */

import { SESSION_COOKIE_NAME, readSessionSecret, verifySessionToken } from '@/app/lib/session';
import type { SessionPayload } from '@/app/lib/session';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { HoldedDirectForm } from './HoldedDirectForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function HoldedDirectLoginPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let sessionEmail: string | null = null;

  if (sessionToken) {
    try {
      const payload = (await verifySessionToken(
        sessionToken,
        readSessionSecret()
      )) as SessionPayload | null;
      sessionEmail = payload?.email ?? null;
    } catch {
      // Invalid or expired session — show auth step
    }
  }

  return (
    <Suspense>
      <HoldedDirectForm sessionEmail={sessionEmail} />
    </Suspense>
  );
}
