'use client';

import { useState } from 'react';
import { getLandingUrl } from '@/lib/urls';

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const landingUrl = getLandingUrl();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      window.location.href = landingUrl;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = getLandingUrl();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
