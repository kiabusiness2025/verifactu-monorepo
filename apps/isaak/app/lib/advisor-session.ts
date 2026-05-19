import { cookies } from 'next/headers';

const COOKIE_NAME = 'isaak_advisor_client';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function getActiveAdvisorClientId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function setActiveAdvisorClientId(clientId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearActiveAdvisorClientId() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
