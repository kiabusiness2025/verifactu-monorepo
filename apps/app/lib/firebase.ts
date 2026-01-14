// Firebase Configuration and Initialization
// https://firebase.google.com/docs/web/setup

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDahYslX6rDZSWcHk4sCXOZnU9cmqgEt0o",
  authDomain: "verifactu-business.firebaseapp.com",
  projectId: "verifactu-business",
  storageBucket: "verifactu-business.firebasestorage.app",
  messagingSenderId: "536174799167",
  appId: "1:536174799167:web:69c286d928239c9069cb8a",
  measurementId: "G-F91R5J137F"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let analytics: Analytics | null = null;
let auth: Auth;
let db: Firestore;
let remoteConfig: RemoteConfig;

// Initialize Firebase App
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Services
// Note: Analytics only works in browser (client-side)
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

// Initialize Auth
auth = getAuth(app);

// Initialize Firestore
db = getFirestore(app);

// Initialize Remote Config
remoteConfig = getRemoteConfig(app);

// Export initialized services
export { app, analytics, auth, db, remoteConfig, firebaseConfig };

// Export Firebase App instance for custom usage
export default app;
