import { remoteConfig as firebaseRemoteConfig } from "./firebase";
import {
  fetchAndActivate,
  getValue,
  RemoteConfig,
} from "firebase/remote-config";

let remoteConfig: RemoteConfig | null = null;

if (typeof window !== "undefined") {
  try {
    // Use centralized Firebase Remote Config instance
    remoteConfig = firebaseRemoteConfig;
    
    // Settings
    remoteConfig.settings = {
      minimumFetchIntervalMillis: 3600000, // 1 hour
      fetchTimeoutMillis: 60000, // 60 seconds
    };
    
    // Default values (fallback si no hay conexión)
    remoteConfig.defaultConfig = {
      // Feature flags
      feature_isaak_chat: true,
      feature_isaak_proactive: true,
      feature_isaak_deadlines: true,
      feature_new_dashboard: false,
      
      // UI Configuration
      ui_theme_primary_color: "#0060F0",
      ui_show_onboarding: true,
      ui_max_companies: 3,
      
      // Business logic
      pricing_free_invoices_limit: 10,
      pricing_trial_days: 14,
      maintenance_mode: false,
      maintenance_message: "Estamos realizando mantenimiento. Volvemos pronto.",
      
      // API endpoints
      api_verifactu_endpoint: "https://api.verifactu.business",
      api_timeout_ms: 30000,
    };

    console.log("✅ Firebase Remote Config initialized");
  } catch (error) {
    console.error("Error initializing Firebase Remote Config:", error);
  }
}

/**
 * Fetch and activate remote config values
 * Call this on app initialization or when you want to refresh
 */
export async function initRemoteConfig(): Promise<boolean> {
  if (!remoteConfig) {
    console.warn("Remote Config not initialized");
    return false;
  }

  try {
    const activated = await fetchAndActivate(remoteConfig);
    console.log("Remote Config fetched and activated:", activated);
    return activated;
  } catch (error) {
    console.error("Error fetching remote config:", error);
    return false;
  }
}

/**
 * Get a boolean feature flag
 */
export function getFeatureFlag(key: string): boolean {
  if (!remoteConfig) return false;
  
  try {
    return getValue(remoteConfig, key).asBoolean();
  } catch (error) {
    console.error(`Error getting feature flag "${key}":`, error);
    return false;
  }
}

/**
 * Get a string value
 */
export function getRemoteString(key: string): string {
  if (!remoteConfig) return "";
  
  try {
    return getValue(remoteConfig, key).asString();
  } catch (error) {
    console.error(`Error getting remote string "${key}":`, error);
    return "";
  }
}

/**
 * Get a number value
 */
export function getRemoteNumber(key: string): number {
  if (!remoteConfig) return 0;
  
  try {
    return getValue(remoteConfig, key).asNumber();
  } catch (error) {
    console.error(`Error getting remote number "${key}":`, error);
    return 0;
  }
}

/**
 * Get a JSON object
 */
export function getRemoteJSON<T = any>(key: string): T | null {
  if (!remoteConfig) return null;
  
  try {
    const jsonString = getValue(remoteConfig, key).asString();
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`Error getting remote JSON "${key}":`, error);
    return null;
  }
}

// Hook para React
export { remoteConfig };
