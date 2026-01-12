"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { logout as firebaseLogout } from "../lib/auth";
import { clearSessionCookie } from "../lib/serverSession";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      // Clear session cookie first
      await clearSessionCookie();
      
      // Then sign out from Firebase
      await firebaseLogout();

      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Redirect anyway
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  return { logout, isLoggingOut };
}
