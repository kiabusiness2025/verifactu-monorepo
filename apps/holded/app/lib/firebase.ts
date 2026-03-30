import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';

const REQUIRED_CONFIG_FIELDS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/[\r\n]/g, '').trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  return unquoted;
}

// Next.js only exposes NEXT_PUBLIC_* vars to the client when they are
// referenced statically. Do not read them via process.env[name] here.
const PUBLIC_ENV = {
  NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN,
  NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN:
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN,
  NEXT_PUBLIC_USE_AUTH_EMULATOR: process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR,
} as const;

function readEnv(primary: string, fallback?: string): string | undefined {
  const first = cleanEnv(PUBLIC_ENV[primary as keyof typeof PUBLIC_ENV]);
  if (first) return first;
  if (!fallback) return undefined;
  return cleanEnv(PUBLIC_ENV[fallback as keyof typeof PUBLIC_ENV]);
}

function normalizeAuthDomain(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0]?.trim();
  return withoutPath || undefined;
}

const firebaseConfig = {
  apiKey: readEnv('NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: normalizeAuthDomain(
    readEnv('NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
  ),
  projectId: readEnv('NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv(
    'NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
  messagingSenderId: readEnv(
    'NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  appId: readEnv('NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'),
};
const appCheckSiteKey = readEnv(
  'NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY',
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY'
);
const rawAppCheckDebugToken = readEnv(
  'NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN',
  'NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN'
);
const appCheckDebugToken =
  rawAppCheckDebugToken?.toLowerCase() === 'true' ? true : rawAppCheckDebugToken || null;

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
const missingConfigFields = REQUIRED_CONFIG_FIELDS.filter((field) => !firebaseConfig[field]);
let isFirebaseReady = false;
let firebaseInitError: string | null = null;
let appCheckInitError: string | null = null;
let isAppCheckReady = false;
let appCheckMode: 'disabled' | 'recaptcha_v3' | 'debug' = 'disabled';

let app: ReturnType<typeof initializeApp> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;
let appCheck: AppCheck | undefined;

if (typeof window !== 'undefined' && isConfigComplete) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    isFirebaseReady = true;
    firebaseInitError = null;

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });

    if (PUBLIC_ENV.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
      const authWithEmulatorFlag = auth as typeof auth & { emulatorConfig?: unknown };
      if (!authWithEmulatorFlag.emulatorConfig) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
    }

    if (appCheckSiteKey) {
      try {
        if (appCheckDebugToken !== null) {
          (
            globalThis as typeof globalThis & {
              FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
            }
          ).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
        }

        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        isAppCheckReady = true;
        appCheckInitError = null;
        appCheckMode = appCheckDebugToken !== null ? 'debug' : 'recaptcha_v3';
      } catch (error) {
        console.error('Error initializing Firebase App Check:', error);
        appCheck = undefined;
        isAppCheckReady = false;
        appCheckInitError =
          error instanceof Error ? error.message : 'Unknown Firebase App Check init error';
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    app = undefined;
    auth = undefined;
    appCheck = undefined;
    isFirebaseReady = false;
    isAppCheckReady = false;
    appCheckMode = 'disabled';
    firebaseInitError = error instanceof Error ? error.message : 'Unknown Firebase init error';
    appCheckInitError = null;
  }
} else if (typeof window !== 'undefined' && !isConfigComplete) {
  console.warn(
    `Firebase config incomplete for Holded auth. Missing: ${missingConfigFields.join(', ')}. Set NEXT_PUBLIC_HOLDED_FIREBASE_* or NEXT_PUBLIC_FIREBASE_* env vars in the deployed project.`
  );
  firebaseInitError = `Missing public Firebase config: ${missingConfigFields.join(', ')}`;
}

export {
  app,
  appCheck,
  auth,
  appCheckInitError,
  appCheckSiteKey,
  appCheckMode,
  isAppCheckReady,
  isConfigComplete as isFirebaseConfigComplete,
  isFirebaseReady,
  firebaseInitError,
  missingConfigFields,
};
