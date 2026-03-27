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

function readEnv(primary: string, fallback?: string): string | undefined {
  const first = cleanEnv(process.env[primary]);
  if (first) return first;
  if (!fallback) return undefined;
  return cleanEnv(process.env[fallback]);
}

function normalizeAuthDomain(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0]?.trim();
  return withoutPath || undefined;
}

const defaultFirebaseConfig = {
  apiKey: readEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: normalizeAuthDomain(readEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')),
  projectId: readEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const holdedFirebaseConfig = {
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

function isHoldedAuthRoute() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/auth/holded');
}

const useHoldedFirebase = isHoldedAuthRoute();
const firebaseConfig = useHoldedFirebase ? holdedFirebaseConfig : defaultFirebaseConfig;

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
const missingConfigFields = REQUIRED_CONFIG_FIELDS.filter((field) => !firebaseConfig[field]);
let isFirebaseReady = false;

// Initialize Firebase only on client-side
let app: any;
let auth: any;

if (typeof window !== 'undefined' && isConfigComplete) {
  try {
    if (useHoldedFirebase) {
      app = getApps().some((existingApp) => existingApp.name === 'holded-auth')
        ? getApp('holded-auth')
        : initializeApp(firebaseConfig, 'holded-auth');
    } else {
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    isFirebaseReady = true;

    // Enable persistence (stay logged in after refresh)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });

    // Use emulator in development (optional)
    if (process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
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
  const envFamily = useHoldedFirebase
    ? 'NEXT_PUBLIC_HOLDED_FIREBASE_* or NEXT_PUBLIC_FIREBASE_*'
    : 'NEXT_PUBLIC_FIREBASE_*';
  const routeLabel = useHoldedFirebase ? 'Landing /auth/holded' : 'Landing auth';
  console.warn(
    `Firebase config incomplete for ${routeLabel}. Missing: ${missingConfigFields.join(', ')}. Set ${envFamily} env vars in the deployed project.`
  );
}

export { app, auth, isConfigComplete as isFirebaseConfigComplete, isFirebaseReady };
