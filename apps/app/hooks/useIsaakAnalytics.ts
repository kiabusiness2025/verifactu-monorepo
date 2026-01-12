/**
 * useIsaakAnalytics - Track user interactions with Isaak components
 * Monitors: bubble views, clicks, chat openings, suggestion usage, voice commands
 */

import { useCallback, useEffect } from "react";

export interface AnalyticsEvent {
  timestamp: Date;
  type:
    | "bubble_view"
    | "bubble_click"
    | "bubble_dismiss"
    | "chat_open"
    | "chat_close"
    | "suggestion_click"
    | "message_sent"
    | "voice_start"
    | "voice_end";
  messageId?: string;
  context?: "landing" | "dashboard" | "admin";
  role?: "visitor" | "user" | "admin";
  metadata?: Record<string, any>;
}

const ANALYTICS_STORAGE_KEY = "isaak_analytics";
const ANALYTICS_MAX_EVENTS = 500; // Keep last 500 events

export function useIsaakAnalytics() {
  // Get analytics from localStorage
  const getAnalytics = useCallback(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  // Track an event
  const trackEvent = useCallback((event: Omit<AnalyticsEvent, "timestamp">) => {
    if (typeof window === "undefined") return;

    const events = getAnalytics();
    const newEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Keep only recent events
    events.push(newEvent);
    if (events.length > ANALYTICS_MAX_EVENTS) {
      events.shift();
    }

    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events));
  }, [getAnalytics]);

  // Get analytics summary
  const getAnalyticsSummary = useCallback(() => {
    const events = getAnalytics();
    const summary = {
      totalEvents: events.length,
      bubbleViews: events.filter((e: AnalyticsEvent) => e.type === "bubble_view").length,
      bubbleClicks: events.filter(
        (e: AnalyticsEvent) => e.type === "bubble_click"
      ).length,
      chatOpens: events.filter(
        (e: AnalyticsEvent) => e.type === "chat_open"
      ).length,
      messagesSent: events.filter(
        (e: AnalyticsEvent) => e.type === "message_sent"
      ).length,
      voiceUsage: events.filter(
        (e: AnalyticsEvent) =>
          e.type === "voice_start" || e.type === "voice_end"
      ).length,
      topMessages: getTopMessages(events),
      lastActivity: events[events.length - 1]?.timestamp,
    };
    return summary;
  }, [getAnalytics]);

  // Get top performing messages
  const getTopMessages = useCallback((events: AnalyticsEvent[]) => {
    const messageClicks: Record<string, number> = {};
    events.forEach((e: AnalyticsEvent) => {
      if (e.type === "suggestion_click" && e.messageId) {
        messageClicks[e.messageId] = (messageClicks[e.messageId] || 0) + 1;
      }
    });
    return Object.entries(messageClicks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }, []);

  // Clear old events (keep last N days)
  const clearOldEvents = useCallback((daysToKeep: number = 30) => {
    const events = getAnalytics();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filtered = events.filter(
      (e: AnalyticsEvent) =>
        new Date(e.timestamp) >= cutoffDate
    );
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(filtered));
  }, [getAnalytics]);

  // Export analytics for reporting
  const exportAnalytics = useCallback(() => {
    const events = getAnalytics();
    const csv = convertToCSV(events);
    downloadCSV(csv, "isaak-analytics.csv");
  }, [getAnalytics]);

  return {
    trackEvent,
    getAnalytics,
    getAnalyticsSummary,
    clearOldEvents,
    exportAnalytics,
  };
}

function convertToCSV(events: AnalyticsEvent[]): string {
  if (events.length === 0) return "";

  const headers = [
    "timestamp",
    "type",
    "messageId",
    "context",
    "role",
    "metadata",
  ];
  const rows = events.map((e) => [
    new Date(e.timestamp).toISOString(),
    e.type,
    e.messageId || "",
    e.context || "",
    e.role || "",
    JSON.stringify(e.metadata || {}),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) =>
      r
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
