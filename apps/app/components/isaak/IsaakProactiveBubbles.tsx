"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useProactiveMessages } from "@/hooks/useProactiveMessages";
import { useIsaakPreferences } from "@/hooks/useIsaakPreferences";
import { useIsaakAnalytics } from "@/hooks/useIsaakAnalytics";

type ProactiveMessage = {
  id: string;
  title: string;
  message: string;
  action?: string;
  href?: string;
  icon: "info" | "warning" | "success" | "tip";
  delay: number;
};

export function IsaakProactiveBubbles() {
  const messages = useProactiveMessages();
  const { preferences } = useIsaakPreferences();
  const { trackEvent } = useIsaakAnalytics();
  const [activeMessages, setActiveMessages] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(
    new Set(preferences.dismissedBubbles)
  );

  useEffect(() => {
    // Check if bubbles are disabled
    if (!preferences.bubblesEnabled || preferences.bubbleFrequency === "never") {
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    messages.forEach((msg) => {
      if (!dismissed.has(msg.id)) {
        const timer = setTimeout(() => {
          setActiveMessages((prev) => {
            if (!prev.includes(msg.id)) {
              return [...prev, msg.id];
            }
            return prev;
          });
          // Track bubble view in analytics
          trackEvent({
            type: "bubble_view",
            messageId: msg.id,
          });
        }, msg.delay);

        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [messages, dismissed, preferences, trackEvent]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    setActiveMessages((prev) => prev.filter((msgId) => msgId !== id));
    // Track dismissal in analytics
    trackEvent({
      type: "bubble_dismiss",
      messageId: id,
    });
    // Store in preferences
    const updatedDismissed = Array.from(new Set([...preferences.dismissedBubbles, id]));
    // Note: preferences update would be handled by useIsaakPreferences
  }, [preferences.dismissedBubbles, trackEvent]);

  const getIcon = (type: string) => {
    switch (type) {
      case "tip":
        return <Lightbulb className="h-5 w-5 text-amber-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "tip":
        return "bg-amber-50 border-amber-200";
      case "warning":
        return "bg-red-50 border-red-200";
      case "success":
        return "bg-green-50 border-green-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-20 max-w-sm space-y-3">
      <AnimatePresence>
        {messages
          .filter((msg) => activeMessages.includes(msg.id))
          .map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`rounded-lg border p-4 shadow-lg ${getBgColor(
                msg.icon
              )}`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">{getIcon(msg.icon)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{msg.title}</h3>
                  <p className="mt-1 text-sm text-gray-700">{msg.message}</p>
                  {msg.action && msg.href ? (
                    <a
                      href={msg.href}
                      className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      {msg.action} →
                    </a>
                  ) : null}
                </div>
                <button
                  onClick={() => handleDismiss(msg.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
