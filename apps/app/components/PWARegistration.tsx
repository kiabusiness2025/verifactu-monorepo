"use client";

import { useEffect } from "react";

export function PWARegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });

      // Handle offline/online events
      window.addEventListener("online", () => {
        console.log("[PWA] Back online");
      });

      window.addEventListener("offline", () => {
        console.log("[PWA] Gone offline");
      });
    }
  }, []);

  return null;
}
