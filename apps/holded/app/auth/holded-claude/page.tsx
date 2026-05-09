import { SESSION_COOKIE_NAME, readSessionSecret, verifySessionToken } from '@/app/lib/session';
import type { SessionPayload } from '@/app/lib/session';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { HoldedClaudeForm } from './HoldedClaudeForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function HoldedClaudeLoginPage() {
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
      <HoldedClaudeForm sessionEmail={sessionEmail} />
    </Suspense>
  );
}
