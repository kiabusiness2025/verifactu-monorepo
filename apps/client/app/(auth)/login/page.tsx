'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    const landingUrl = (process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business').replace(/\/$/, '');
    window.location.href = `${landingUrl}/auth/login`;
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Redirigiendo al login...</h1>
        <p className="text-gray-600 dark:text-gray-400">Te estamos llevando a la pagina de autenticacion.</p>
      </div>
    </div>
  );
}
