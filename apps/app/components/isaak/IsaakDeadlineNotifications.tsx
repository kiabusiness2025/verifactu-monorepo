"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, AlertCircle } from "lucide-react";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";

export function IsaakDeadlineNotifications() {
  const { upcomingDeadlines, getDaysUntil } =
    useDeadlineNotifications();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    new Set()
  );

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const visibleDeadlines = upcomingDeadlines.filter(
    (d) => !dismissedIds.has(d.id)
  );

  if (visibleDeadlines.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-35 max-w-sm space-y-3">
      <AnimatePresence>
        {visibleDeadlines.map((deadline, index) => {
          const daysUntil = getDaysUntil(deadline.date);
          const isUrgent = daysUntil <= 3;
          const isCritical = daysUntil <= 0;

          return (
            <motion.div
              key={deadline.id}
              initial={{ opacity: 0, x: 20, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg p-4 shadow-lg border-l-4 ${
                isCritical
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                  : isUrgent
                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isCritical ? (
                    <AlertCircle
                      className={`w-5 h-5 ${
                        isCritical
                          ? "text-red-600 dark:text-red-400"
                          : "text-orange-600 dark:text-orange-400"
                      }`}
                    />
                  ) : (
                    <Clock
                      className={`w-5 h-5 ${
                        isUrgent
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    {deadline.title}
                  </h4>
                  <p
                    className={`text-xs mt-1 ${
                      isCritical
                        ? "text-red-600 dark:text-red-400"
                        : isUrgent
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {daysUntil < 0
                      ? `Vencido hace ${Math.abs(daysUntil)} dias`
                      : daysUntil === 0
                      ? "Hoy es el vencimiento"
                      : `Vence en ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatShortDate(deadline.date)}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(deadline.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                >
                  ×
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}


