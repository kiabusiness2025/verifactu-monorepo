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

// Configure Remote Config settings
// Development: 1 hour minimum fetch interval for rapid iteration
// Production: 12 hours (43200000 ms) - set in Firebase Console per environment
if (typeof window !== 'undefined') {
  remoteConfig.settings = {
    minimumFetchIntervalMillis: process.env.NODE_ENV === 'development' ? 3600000 : 43200000,
    fetchTimeoutMillis: 60000,
  };
}

// Set default values for Remote Config
// These fallback values are used if remote values cannot be fetched
remoteConfig.defaultConfig = {
  // === FEATURE FLAGS ===
  feature_isaak_chat: 'true',
  feature_isaak_proactive: 'true',
  feature_isaak_deadlines: 'true',
  feature_new_dashboard: 'false',
  feature_advanced_reporting: 'false',
  
  // === UI CONFIGURATION ===
  ui_theme_primary_color: '#0060F0',
  ui_show_onboarding: 'true',
  ui_max_companies_per_user: '3',
  ui_maintenance_mode: 'false',
  ui_maintenance_message: 'Estamos realizando mantenimiento. Volvemos pronto.',
  
  // === RESEND EMAIL SETTINGS ===
  resend_enabled: 'true',
  resend_from_email: 'noreply@verifactu.business',
  resend_max_recipients: '100',
  
  // === eINFORMA SETTINGS ===
  einforma_enabled: 'true',
  einforma_timeout_ms: '8000',
  einforma_api_version: 'v1',
  
  // === INVOICE SETTINGS ===
  invoice_max_upload_size_mb: '10',
  invoice_default_export_format: 'pdf',
  invoice_retention_days: '2555',
  
  // === PRICING & TRIAL ===
  pricing_free_tier_invoice_limit: '10',
  pricing_trial_days: '14',
  pricing_enterprise_enabled: 'false',
  
  // === API & BACKEND ===
  api_base_url: 'https://api.verifactu.business',
  api_request_timeout_ms: '30000',
  database_sync_interval_ms: '60000',
  
  // === MESSAGES & COPY ===
  welcome_message: 'Bienvenido a Verifactu Business',
  support_email: 'soporte@verifactu.business',
  support_phone: '+34-XXX-XXX-XXX',
};

// Export initialized services
export { analytics, app, auth, db, firebaseConfig, remoteConfig };

// Export Firebase App instance for custom usage
export default app;
