import { NextResponse } from 'next/server';
import { isFirebaseConfigComplete, missingConfigFields } from '@/app/lib/firebase';

export const runtime = 'nodejs';

function isSet(name: string) {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}

function parseHost(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).host || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const holdedSiteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || null;
  const holdedSiteHost = parseHost(holdedSiteUrl);

  const checks = {
    firebaseClientConfigComplete: isFirebaseConfigComplete,
    firebaseClientMissingFields: missingConfigFields,
    firebaseAdminConfigured:
      isSet('FIREBASE_ADMIN_PROJECT_ID') &&
      isSet('FIREBASE_ADMIN_CLIENT_EMAIL') &&
      isSet('FIREBASE_ADMIN_PRIVATE_KEY'),
    sessionSecretConfigured: isSet('SESSION_SECRET'),
    holdedSiteUrlConfigured: isSet('NEXT_PUBLIC_HOLDED_SITE_URL'),
    holdedAuthorizedDomainExpected: holdedSiteHost,
    cookieDomain: process.env.SESSION_COOKIE_DOMAIN || null,
    holdedSiteUrl,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  };

  const missing = {
    firebaseClient: missingConfigFields,
    server: [
      !checks.firebaseAdminConfigured ? 'FIREBASE_ADMIN_*' : null,
      !checks.sessionSecretConfigured ? 'SESSION_SECRET' : null,
      !checks.holdedSiteUrlConfigured ? 'NEXT_PUBLIC_HOLDED_SITE_URL' : null,
    ].filter(Boolean),
  };

  const warnings = [
    holdedSiteHost
      ? `Autoriza manualmente ${holdedSiteHost} en Firebase Authentication -> Authorized domains.`
      : 'No se ha podido inferir el dominio publico de Holded desde NEXT_PUBLIC_HOLDED_SITE_URL.',
    'Este endpoint no puede leer los Authorized domains reales de Firebase; esa comprobacion sigue siendo manual.',
    'Para Firebase Web popup/redirect, el callback critico suele ser https://verifactu-business.firebaseapp.com/__/auth/handler.',
  ];

  const suggestions = [
    'En Firebase Authentication activa Google como proveedor y Email/Password como metodo de acceso.',
    'Anade holded.verifactu.business en Firebase Authentication -> Authorized domains si el login se abre desde Holded.',
    'Confirma que NEXT_PUBLIC_HOLDED_FIREBASE_* o NEXT_PUBLIC_FIREBASE_* estan definidos en el proyecto de Vercel de Holded.',
    'Valida que FIREBASE_ADMIN_* y SESSION_SECRET estan definidos para sesion backend.',
    'En Google Cloud Console, verifica que el OAuth client usado por Firebase mantiene https://verifactu-business.firebaseapp.com/__/auth/handler como redirect URI.',
  ];

  const ok =
    checks.firebaseClientConfigComplete &&
    checks.firebaseAdminConfigured &&
    checks.sessionSecretConfigured &&
    checks.holdedSiteUrlConfigured;

  return NextResponse.json({ ok, checks, missing, warnings, suggestions });
}
