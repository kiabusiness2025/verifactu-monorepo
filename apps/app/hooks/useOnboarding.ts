/**
 * Hook para gestionar el estado de onboarding del usuario
 */

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

interface OnboardingState {
  hasSeenWelcome: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
}

interface OnboardingActions {
  markWelcomeSeen: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

export function useOnboarding(): OnboardingState & OnboardingActions {
  const { user } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Optimistic: ocultar modal por defecto
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOnboardingStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/user/preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch preferences");
        }

        const data = await response.json();
        
        // Si no tiene displayName, debe ver el welcome modal
        const needsName = !user.displayName || user.displayName.trim() === "";
        
        setHasSeenWelcome(data.has_seen_welcome || false);
        setHasCompletedOnboarding(data.has_completed_onboarding || false);

        // Si necesita nombre y no ha visto welcome, mostrar modal
        if (needsName && !data.has_seen_welcome) {
          setHasSeenWelcome(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching onboarding status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOnboardingStatus();
  }, [user]);

  const markWelcomeSeen = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          has_seen_welcome: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update welcome status");
      }

      setHasSeenWelcome(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error marking welcome seen:", err);
    }
  };

  const markOnboardingComplete = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          has_completed_onboarding: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update onboarding status");
      }

      setHasCompletedOnboarding(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error marking onboarding complete:", err);
    }
  };

  return {
    hasSeenWelcome,
    hasCompletedOnboarding,
    isLoading,
    error,
    markWelcomeSeen,
    markOnboardingComplete,
  };
}
