"use client";

import { useState } from "react";
import { getLandingUrl } from "@/lib/urls";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      // Llamar endpoint de logout en landing para limpiar cookie cross-domain
      const landingUrl = getLandingUrl();
      const response = await fetch(`${landingUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Error al cerrar sesión");
      }

      // Redirigir a landing después de logout
      window.location.href = landingUrl;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Redirigir de todas formas
      window.location.href = getLandingUrl();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
