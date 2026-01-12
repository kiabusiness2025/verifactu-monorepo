/**
 * useIsaakPreferences - User preferences for Isaak behavior and appearance
 * Allows customization: disable bubbles, adjust frequency, theme, etc.
 */

import { useCallback, useState, useEffect } from "react";

export interface IsaakPreferences {
  // Bubble notifications
  bubblesEnabled: boolean;
  bubbleFrequency: "always" | "daily" | "weekly" | "never"; // If set to "never", hidden
  bubblePosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  dismissedBubbles: string[]; // IDs of dismissed bubbles (don't show again)

  // Chat preferences
  chatEnabled: boolean;
  chatTheme: "light" | "dark" | "auto";
  chatHistoryEnabled: boolean;
  chatPosition: "bottom-right" | "bottom-left";

  // Voice preferences
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceLanguage: string;

  // Notification preferences
  deadlineNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;

  // Privacy
  analyticsEnabled: boolean;

  // Context preferences
  landingEnabled: boolean;
  dashboardEnabled: boolean;
  adminEnabled: boolean;
}

const DEFAULT_PREFERENCES: IsaakPreferences = {
  bubblesEnabled: true,
  bubbleFrequency: "always",
  bubblePosition: "bottom-right",
  dismissedBubbles: [],
  chatEnabled: true,
  chatTheme: "auto",
  chatHistoryEnabled: true,
  chatPosition: "bottom-right",
  voiceEnabled: false,
  voiceRate: 1,
  voicePitch: 1,
  voiceLanguage: "es",
  deadlineNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  analyticsEnabled: true,
  landingEnabled: true,
  dashboardEnabled: true,
  adminEnabled: true,
};

const PREFERENCES_KEY = "isaak_preferences";

export function useIsaakPreferences() {
  const [preferences, setPreferences] = useState<IsaakPreferences>(
    DEFAULT_PREFERENCES
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(PREFERENCES_KEY);
    const userPrefs = stored
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
      : DEFAULT_PREFERENCES;

    setPreferences(userPrefs);
    setIsLoaded(true);
  }, []);

  // Get all preferences
  const getPreferences = useCallback((): IsaakPreferences => {
    return preferences;
  }, [preferences]);

  // Update a preference
  const updatePreference = useCallback(
    <K extends keyof IsaakPreferences>(
      key: K,
      value: IsaakPreferences[K]
    ) => {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      }
    },
    [preferences]
  );

  // Update multiple preferences at once
  const updatePreferences = useCallback(
    (updates: Partial<IsaakPreferences>) => {
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      }
    },
    [preferences]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    if (typeof window !== "undefined") {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    }
  }, []);

  // Dismiss a bubble (don't show again in this session)
  const dismissBubble = useCallback(
    (bubbleId: string) => {
      const updated = {
        ...preferences,
        dismissedBubbles: [...preferences.dismissedBubbles, bubbleId],
      };
      setPreferences(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      }
    },
    [preferences]
  );

  // Check if Isaak is enabled for a context
  const isEnabledForContext = useCallback(
    (context: "landing" | "dashboard" | "admin"): boolean => {
      const contextKey = `${context}Enabled` as const;
      return preferences[contextKey];
    },
    [preferences]
  );

  // Export preferences as JSON
  const exportPreferences = useCallback(() => {
    const data = JSON.stringify(preferences, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "isaak-preferences.json";
    a.click();
    window.URL.revokeObjectURL(url);
  }, [preferences]);

  // Import preferences from JSON
  const importPreferences = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const updated = { ...DEFAULT_PREFERENCES, ...imported };
        setPreferences(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Error importing preferences:", error);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    preferences,
    isLoaded,
    getPreferences,
    updatePreference,
    updatePreferences,
    resetToDefaults,
    dismissBubble,
    isEnabledForContext,
    exportPreferences,
    importPreferences,
  };
}
