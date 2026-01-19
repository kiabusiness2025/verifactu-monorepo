import { remoteConfig as firebaseRemoteConfig } from "./firebase";
import {
  fetchAndActivate,
  getValue,
  onConfigUpdate,
  RemoteConfig,
} from "firebase/remote-config";

let remoteConfig: RemoteConfig | null = null;
let configUpdateUnsubscribe: (() => void) | null = null;

if (typeof window !== "undefined") {
  try {
    // Use centralized Firebase Remote Config instance
    remoteConfig = firebaseRemoteConfig;
    console.log("✅ Firebase Remote Config initialized with defaults");
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
    console.log("✅ Remote Config fetched and activated:", activated);
    
    // Start listening for updates in real-time
    startConfigUpdateListener();
    
    return activated;
  } catch (error) {
    console.error("Error fetching remote config:", error);
    return false;
  }
}

/**
 * Listen for Remote Config updates in real-time
 * This will automatically fetch new values when they're published
 */
function startConfigUpdateListener() {
  if (!remoteConfig) return;

  // Clean up previous listener if exists
  if (configUpdateUnsubscribe) {
    configUpdateUnsubscribe();
  }

  try {
    configUpdateUnsubscribe = onConfigUpdate(remoteConfig, {
      next: (configUpdate) => {
        const updatedKeys = Array.from(configUpdate.getUpdatedKeys());
        console.log("🔄 Remote Config updated with keys:", updatedKeys);
        
        // Activate the new config
        if (typeof window !== 'undefined' && remoteConfig) {
          remoteConfig.activate?.().then(() => {
            console.log("✅ New Remote Config activated");
          });
        }
      },
      error: (error) => {
        console.error("❌ Remote Config update error:", error);
      },
      complete: () => {
        console.log("Remote Config listener complete");
      },
    });
  } catch (error) {
    console.error("Error setting up config update listener:", error);
  }
}

/**
 * Stop listening for Real-time Config updates
 */
export function stopConfigUpdateListener() {
  if (configUpdateUnsubscribe) {
    configUpdateUnsubscribe();
    configUpdateUnsubscribe = null;
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
