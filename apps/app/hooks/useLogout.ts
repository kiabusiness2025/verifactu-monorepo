"use client";

import { useState } from "react";
import { getLandingUrl } from "@/lib/urls";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      // Call logout endpoint on landing to clear cookie and Firebase session
      const landingUrl = getLandingUrl();
      await fetch(`${landingUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // Redirect to landing home page after logout
      window.location.href = landingUrl;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Redirect anyway
      window.location.href = getLandingUrl();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
