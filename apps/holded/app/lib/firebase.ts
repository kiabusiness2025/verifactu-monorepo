import { getApp, getApps, initializeApp } from 'firebase/app';
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

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
const missingConfigFields = REQUIRED_CONFIG_FIELDS.filter((field) => !firebaseConfig[field]);
let isFirebaseReady = false;
let firebaseInitError: string | null = null;

let app: ReturnType<typeof initializeApp> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;

if (typeof window !== 'undefined' && isConfigComplete) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    isFirebaseReady = true;
    firebaseInitError = null;

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });

    if (process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
      const authWithEmulatorFlag = auth as typeof auth & { emulatorConfig?: unknown };
      if (!authWithEmulatorFlag.emulatorConfig) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    app = undefined;
    auth = undefined;
    isFirebaseReady = false;
    firebaseInitError = error instanceof Error ? error.message : 'Unknown Firebase init error';
  }
} else if (typeof window !== 'undefined' && !isConfigComplete) {
  console.warn(
    `Firebase config incomplete for Holded auth. Missing: ${missingConfigFields.join(', ')}. Set NEXT_PUBLIC_HOLDED_FIREBASE_* or NEXT_PUBLIC_FIREBASE_* env vars in the deployed project.`
  );
  firebaseInitError = `Missing public Firebase config: ${missingConfigFields.join(', ')}`;
}

export {
  app,
  auth,
  isConfigComplete as isFirebaseConfigComplete,
  isFirebaseReady,
  firebaseInitError,
  missingConfigFields,
};
