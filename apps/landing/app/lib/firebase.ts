import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const defaultFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const holdedFirebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env.NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isHoldedAuthRoute() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/auth/holded");
}

const useHoldedFirebase = isHoldedAuthRoute();
const firebaseConfig = useHoldedFirebase ? holdedFirebaseConfig : defaultFirebaseConfig;

const isConfigComplete = Object.values(firebaseConfig).every(Boolean);
let isFirebaseReady = false;

// Initialize Firebase only on client-side
let app: any;
let auth: any;

if (typeof window !== "undefined" && isConfigComplete) {
  try {
    if (useHoldedFirebase) {
      app = getApps().some((existingApp) => existingApp.name === "holded-auth")
        ? getApp("holded-auth")
        : initializeApp(firebaseConfig, "holded-auth");
    } else {
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    isFirebaseReady = true;

    // Enable persistence (stay logged in after refresh)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
    });

    // Use emulator in development (optional)
    if (process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === "true") {
      try {
        connectAuthEmulator(auth, "http://localhost:9099");
      } catch (error) {
        // Emulator already connected
      }
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    app = undefined;
    auth = undefined;
    isFirebaseReady = false;
  }
} else if (typeof window !== "undefined" && !isConfigComplete) {
  console.warn("Firebase config incomplete: set NEXT_PUBLIC_FIREBASE_* env vars to enable auth.");
}

export { app, auth, isConfigComplete as isFirebaseConfigComplete, isFirebaseReady };
