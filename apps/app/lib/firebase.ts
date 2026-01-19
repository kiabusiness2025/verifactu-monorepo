// Firebase Configuration and Initialization
// https://firebase.google.com/docs/web/setup

import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getRemoteConfig } from 'firebase/remote-config';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: 'AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o',
  authDomain: 'verifactu-business.firebaseapp.com',
  projectId: 'verifactu-business',
  storageBucket: 'verifactu-business.firebasestorage.app',
  messagingSenderId: '536174799167',
  appId: '1:536174799167:web:69c286d928239c9069cb8a',
  measurementId: 'G-F91R5J137F',
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
