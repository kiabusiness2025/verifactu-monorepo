/**
 * useDeadlineNotifications - Alert system for upcoming deadlines and important dates
 * Integrates with financial calendar (quarterly VAT, annual models, etc.)
 */

import { useCallback, useEffect, useState } from "react";

export interface Deadline {
  id: string;
  title: string;
  date: Date;
  type: "quarterly_vat" | "annual_tax" | "payment" | "custom";
  context: "dashboard" | "admin";
  priority: "critical" | "high" | "normal";
  notified?: boolean;
}

const DEADLINES_KEY = "isaak_deadlines";
const NOTIFICATIONS_KEY = "isaak_notifications_shown";

// Spanish financial calendar defaults
const SPANISH_DEADLINES = [
  { title: "Declaración IVA Q1", month: 4, day: 20, type: "quarterly_vat" as const },
  { title: "Declaración IVA Q2", month: 7, day: 20, type: "quarterly_vat" as const },
  { title: "Declaración IVA Q3", month: 10, day: 20, type: "quarterly_vat" as const },
  { title: "Renta Anual", month: 6, day: 30, type: "annual_tax" as const },
  { title: "Impuesto Sociedades", month: 4, day: 25, type: "annual_tax" as const },
];

export function useDeadlineNotifications() {
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);

  // Initialize default Spanish deadlines
  const initializeDeadlines = useCallback(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(DEADLINES_KEY);
    if (stored) return; // Already initialized

    const today = new Date();
    const year = today.getFullYear();

    const defaultDeadlines: Deadline[] = SPANISH_DEADLINES.map((dd, idx) => ({
      id: `deadline_${idx}`,
      title: dd.title,
      date: new Date(year, dd.month - 1, dd.day),
      type: dd.type,
      context: "dashboard" as const,
      priority: (dd.type === "annual_tax" ? "critical" : "high") as "critical" | "high",
      notified: false,
    }));

    // Next year's deadlines too
    defaultDeadlines.push(
      ...SPANISH_DEADLINES.map((dd, idx) => ({
        id: `deadline_next_${idx}`,
        title: dd.title,
        date: new Date(year + 1, dd.month - 1, dd.day),
        type: dd.type,
        context: "dashboard" as const,
        priority: (dd.type === "annual_tax" ? "critical" : "high") as "critical" | "high",
        notified: false,
      }))
    );

    localStorage.setItem(DEADLINES_KEY, JSON.stringify(defaultDeadlines));
    setUpcomingDeadlines(getUpcomingDeadlines());
  }, []);

  // Get all deadlines
  const getDeadlines = useCallback((): Deadline[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(DEADLINES_KEY);
    return stored
      ? JSON.parse(stored).map((d: any) => ({
          ...d,
          date: new Date(d.date),
        }))
      : [];
  }, []);

  // Get upcoming deadlines (next 30 days)
  const getUpcomingDeadlines = useCallback((days: number = 30) => {
    const deadlines = getDeadlines();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return deadlines
      .filter((d) => d.date >= today && d.date <= futureDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [getDeadlines]);

  // Add custom deadline
  const addDeadline = useCallback(
    (deadline: Omit<Deadline, "id" | "notified">) => {
      const deadlines = getDeadlines();
      const newDeadline: Deadline = {
        ...deadline,
        id: `deadline_custom_${Date.now()}`,
        notified: false,
      };
      deadlines.push(newDeadline);
      localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
      return newDeadline;
    },
    [getDeadlines]
  );

  // Update deadline
  const updateDeadline = useCallback(
    (id: string, updates: Partial<Deadline>) => {
      const deadlines = getDeadlines();
      const index = deadlines.findIndex((d) => d.id === id);
      if (index !== -1) {
        deadlines[index] = { ...deadlines[index], ...updates };
        localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
      }
    },
    [getDeadlines]
  );

  // Delete deadline
  const deleteDeadline = useCallback(
    (id: string) => {
      const deadlines = getDeadlines();
      const filtered = deadlines.filter((d) => d.id !== id);
      localStorage.setItem(DEADLINES_KEY, JSON.stringify(filtered));
    },
    [getDeadlines]
  );

  // Check for deadlines that need notification
  const checkDeadlineNotifications = useCallback(() => {
    const deadlines = getDeadlines();
    const today = new Date();
    const notifications: Deadline[] = [];

    deadlines.forEach((deadline) => {
      if (deadline.notified) return;

      const daysUntil = Math.ceil(
        (deadline.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notify at: 14 days, 7 days, 1 day, day of
      if (daysUntil >= 0 && daysUntil <= 14) {
        notifications.push(deadline);
        updateDeadline(deadline.id, { notified: true });
      }
    });

    return notifications;
  }, [getDeadlines, updateDeadline]);

  // Calculate days until deadline
  const getDaysUntil = useCallback((deadlineDate: Date): number => {
    const today = new Date();
    return Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, []);

  // Get deadline status message
  const getDeadlineStatus = useCallback((deadline: Deadline): string => {
    const days = getDaysUntil(deadline.date);
    if (days < 0) return "Vencido";
    if (days === 0) return "Hoy";
    if (days === 1) return "Mañana";
    if (days <= 7) return `En ${days} días`;
    if (days <= 14) return `En ${days} días`;
    return `En ${days} días`;
  }, [getDaysUntil]);

  // Check deadlines on mount
  useEffect(() => {
    initializeDeadlines();
    const notifications = checkDeadlineNotifications();
    if (notifications.length > 0) {
      setUpcomingDeadlines(getUpcomingDeadlines());
    }

    // Check every hour for new notifications
    const interval = setInterval(() => {
      checkDeadlineNotifications();
      setUpcomingDeadlines(getUpcomingDeadlines());
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    upcomingDeadlines,
    getDeadlines,
    getUpcomingDeadlines,
    addDeadline,
    updateDeadline,
    deleteDeadline,
    checkDeadlineNotifications,
    getDaysUntil,
    getDeadlineStatus,
  };
}
