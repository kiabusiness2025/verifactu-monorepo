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

function deriveFirebaseAuthHandler(value: string | null) {
  if (!value) return null;

  const normalized = value.replace(/^https?:\/\//i, '').split('/')[0]?.trim();
  if (!normalized) return null;
  return `https://${normalized}/__/auth/handler`;
}

export async function GET() {
  const holdedSiteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || null;
  const holdedSiteHost = parseHost(holdedSiteUrl);
  const firebaseAuthDomain =
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    null;
  const firebaseProjectId =
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null;
  const firebaseAuthHandler = deriveFirebaseAuthHandler(firebaseAuthDomain);

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
    firebaseAuthDomain,
    firebaseProjectId,
    firebaseAuthHandler,
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
    firebaseAuthHandler
      ? `Para Firebase Web popup/redirect, confirma que el callback OAuth autorizado existe: ${firebaseAuthHandler}.`
      : 'No se ha podido derivar la URL exacta del callback Firebase desde NEXT_PUBLIC_*_FIREBASE_AUTH_DOMAIN.',
  ];

  const suggestions = [
    'En Firebase Authentication activa Google como proveedor y Email/Password como metodo de acceso.',
    'Anade holded.verifactu.business en Firebase Authentication -> Authorized domains si el login se abre desde Holded.',
    'Confirma que NEXT_PUBLIC_HOLDED_FIREBASE_* o NEXT_PUBLIC_FIREBASE_* estan definidos en el proyecto de Vercel de Holded.',
    'Valida que FIREBASE_ADMIN_* y SESSION_SECRET estan definidos para sesion backend.',
    firebaseAuthHandler
      ? `En Google Cloud Console, verifica que el OAuth client usado por Firebase mantiene ${firebaseAuthHandler} como redirect URI.`
      : 'En Google Cloud Console, verifica que el OAuth client usado por Firebase mantiene el callback /__/auth/handler del authDomain real como redirect URI.',
  ];

  const ok =
    checks.firebaseClientConfigComplete &&
    checks.firebaseAdminConfigured &&
    checks.sessionSecretConfigured &&
    checks.holdedSiteUrlConfigured;

  return NextResponse.json({ ok, checks, missing, warnings, suggestions });
}
