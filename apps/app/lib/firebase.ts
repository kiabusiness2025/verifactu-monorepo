// Firebase Configuration and Initialization
// https://firebase.google.com/docs/web/setup

import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getRemoteConfig } from 'firebase/remote-config';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern)
const firebaseApp = (() => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  } else {
    return getApps()[0];
  }
})();

const app = firebaseApp;

// Initialize Firebase Services
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

// Initialize Auth, Firestore, and Remote Config
const auth = getAuth(app);
const db = getFirestore(app);
const remoteConfig = getRemoteConfig(app);

// Export initialized services
export { analytics, app, auth, db, firebaseConfig, remoteConfig };

// Export Firebase App instance for custom usage
export default app;
