'use client';

import { useEffect } from 'react';

/**
 * Login Page (App)
 * 
 * This page redirects to the landing page for authentication.
 * Authentication is handled centrally in the landing app (verifactu.business/auth/login)
 * 
 * Flow:
 * 1. User arrives at app.verifactu.business/login
 * 2. This page redirects to verifactu.business/auth/login
 * 3. User authenticates via Google OAuth
 * 4. Landing creates JWT session and redirects back to app.verifactu.business/dashboard
 * 5. Middleware validates session and allows access
 */

export default function LoginPage() {
  useEffect(() => {
    // Redirect to landing authentication page
    window.location.href = 'https://verifactu.business/auth/login';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Redirigiendo al login...
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Te estamos llevando a la página de autenticación.
        </p>
      </div>
    </div>
  );
}
