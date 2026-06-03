import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
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

function normalizeAuthDomain(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0]?.trim();
  return withoutPath || undefined;
}

// Next.js only exposes NEXT_PUBLIC_* variables to the client when they are
// referenced statically. Keep this map in sync with every auth profile.
const PUBLIC_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY,
  NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID,
  NEXT_PUBLIC_ISAAK_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_ISAAK_FIREBASE_API_KEY,
  NEXT_PUBLIC_ISAAK_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_ISAAK_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_ISAAK_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_ISAAK_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_ISAAK_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_ISAAK_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_ISAAK_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_ISAAK_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_ISAAK_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_ISAAK_FIREBASE_APP_ID,
  NEXT_PUBLIC_USE_AUTH_EMULATOR: process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR,
} as const;

function readPublicEnv(primary: keyof typeof PUBLIC_ENV, fallback?: keyof typeof PUBLIC_ENV) {
  const first = cleanEnv(PUBLIC_ENV[primary]);
  if (first) return first;
  if (!fallback) return undefined;
  return cleanEnv(PUBLIC_ENV[fallback]);
}

const defaultFirebaseConfig = {
  apiKey: readPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: normalizeAuthDomain(readPublicEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')),
  projectId: readPublicEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readPublicEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readPublicEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readPublicEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const holdedFirebaseConfig = {
  apiKey: readPublicEnv('NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: normalizeAuthDomain(
    readPublicEnv('NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
  ),
  projectId: readPublicEnv(
    'NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ),
  storageBucket: readPublicEnv(
    'NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
  messagingSenderId: readPublicEnv(
    'NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  appId: readPublicEnv('NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const isaakFirebaseConfig = {
  apiKey: readPublicEnv('NEXT_PUBLIC_ISAAK_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: normalizeAuthDomain(
    readPublicEnv('NEXT_PUBLIC_ISAAK_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
  ),
  projectId: readPublicEnv(
    'NEXT_PUBLIC_ISAAK_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ),
  storageBucket: readPublicEnv(
    'NEXT_PUBLIC_ISAAK_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
  messagingSenderId: readPublicEnv(
    'NEXT_PUBLIC_ISAAK_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  appId: readPublicEnv('NEXT_PUBLIC_ISAAK_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'),
};

function isHoldedAuthRoute() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/auth/holded');
}

function isIsaakAuthRoute() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/auth/isaak');
}

const useHoldedFirebase = isHoldedAuthRoute();
const useIsaakFirebase = !useHoldedFirebase && isIsaakAuthRoute();
const firebaseConfig = useHoldedFirebase
  ? holdedFirebaseConfig
  : useIsaakFirebase
    ? isaakFirebaseConfig
    : defaultFirebaseConfig;
const firebaseAppName = useHoldedFirebase
  ? 'holded-auth'
  : useIsaakFirebase
    ? 'isaak-auth'
    : '[DEFAULT]';
const firebaseEnvFamily = useHoldedFirebase
  ? 'NEXT_PUBLIC_HOLDED_FIREBASE_* or NEXT_PUBLIC_FIREBASE_*'
  : useIsaakFirebase
    ? 'NEXT_PUBLIC_ISAAK_FIREBASE_* or NEXT_PUBLIC_FIREBASE_*'
    : 'NEXT_PUBLIC_FIREBASE_*';

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
const missingConfigFields = REQUIRED_CONFIG_FIELDS.filter((field) => !firebaseConfig[field]);
let isFirebaseReady = false;

// Initialize Firebase only on client-side
let app: any;
let auth: any;

if (typeof window !== 'undefined' && isConfigComplete) {
  try {
    if (firebaseAppName === '[DEFAULT]') {
      app = getApps().some((existingApp) => existingApp.name === '[DEFAULT]')
        ? getApp()
        : initializeApp(firebaseConfig);
    } else {
      app = getApps().some((existingApp) => existingApp.name === firebaseAppName)
        ? getApp(firebaseAppName)
        : initializeApp(firebaseConfig, firebaseAppName);
    }
    auth = getAuth(app);
    isFirebaseReady = true;

    // Enable persistence (stay logged in after refresh)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });

    // Use emulator in development (optional)
    if (PUBLIC_ENV.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099');
      } catch (error) {
        // Emulator already connected
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    app = undefined;
    auth = undefined;
    isFirebaseReady = false;
  }
} else if (typeof window !== 'undefined' && !isConfigComplete) {
  const routeLabel = useHoldedFirebase
    ? 'Landing /auth/holded'
    : useIsaakFirebase
      ? 'Landing /auth/isaak'
      : 'Landing auth';
  console.warn(
    `Firebase config incomplete for ${routeLabel}. Missing: ${missingConfigFields.join(', ')}. Set ${firebaseEnvFamily} env vars in the deployed project.`
  );
}

export {
  app,
  auth,
  firebaseEnvFamily,
  isConfigComplete as isFirebaseConfigComplete,
  isFirebaseReady,
  missingConfigFields,
};
