"use client";

import { useEffect, useState } from "react";
import {
  initRemoteConfig,
  getFeatureFlag,
  getRemoteString,
  getRemoteNumber,
  getRemoteJSON,
} from "@/lib/remoteConfig";

export function useRemoteConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initRemoteConfig();
        setLastFetchTime(new Date());
      } catch (error) {
        console.error("Error initializing remote config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    try {
      await initRemoteConfig();
      setLastFetchTime(new Date());
    } catch (error) {
      console.error("Error refreshing remote config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    lastFetchTime,
    refresh,
    getFeatureFlag,
    getString: getRemoteString,
    getNumber: getRemoteNumber,
    getJSON: getRemoteJSON,
  };
}

// Hook específico para feature flags
export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const { isLoading } = useRemoteConfig();

  useEffect(() => {
    if (!isLoading) {
      setEnabled(getFeatureFlag(flagName));
    }
  }, [flagName, isLoading]);

  return enabled;
}

// Hook para maintenance mode
export function useMaintenanceMode() {
  const { isLoading, getString } = useRemoteConfig();
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "",
  });

  useEffect(() => {
    if (!isLoading) {
      setMaintenance({
        enabled: getFeatureFlag("maintenance_mode"),
        message: getString("maintenance_message"),
      });
    }
  }, [isLoading, getString]);

  return maintenance;
}
