import { NextResponse } from 'next/server';
import { isFirebaseConfigComplete, missingConfigFields } from '@/app/lib/firebase';

export const runtime = 'nodejs';

function isSet(name: string) {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const checks = {
    firebaseClientConfigComplete: isFirebaseConfigComplete,
    firebaseClientMissingFields: missingConfigFields,
    firebaseAdminConfigured:
      isSet('FIREBASE_ADMIN_PROJECT_ID') &&
      isSet('FIREBASE_ADMIN_CLIENT_EMAIL') &&
      isSet('FIREBASE_ADMIN_PRIVATE_KEY'),
    sessionSecretConfigured: isSet('SESSION_SECRET'),
    cookieDomain: process.env.SESSION_COOKIE_DOMAIN || null,
    holdedSiteUrl: process.env.NEXT_PUBLIC_HOLDED_SITE_URL || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  };

  const suggestions = [
    'En Firebase Authentication activa Google como proveedor y Email/Password como método de acceso.',
    'Añade el dominio de despliegue en Firebase Authentication -> Authorized domains.',
    'Confirma que NEXT_PUBLIC_HOLDED_FIREBASE_* o NEXT_PUBLIC_FIREBASE_* están definidos en el proyecto de Vercel de Holded.',
    'Valida que FIREBASE_ADMIN_* y SESSION_SECRET están definidos para sesión backend.',
  ];

  return NextResponse.json({ ok: true, checks, suggestions });
}
