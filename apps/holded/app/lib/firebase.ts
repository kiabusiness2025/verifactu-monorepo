import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[\r\n]/g, '').trim();
}

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
let isFirebaseReady = false;

let app: ReturnType<typeof initializeApp> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;

if (typeof window !== 'undefined' && isConfigComplete) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    isFirebaseReady = true;

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
  }
} else if (typeof window !== 'undefined' && !isConfigComplete) {
  console.warn('Firebase config incomplete: set NEXT_PUBLIC_FIREBASE_* env vars to enable auth.');
}

export { app, auth, isConfigComplete as isFirebaseConfigComplete, isFirebaseReady };
