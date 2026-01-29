'use client';

import { useSearchParams } from 'next/navigation';

export default function AuthErrorClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'Error de configuración del servidor',
    AccessDenied:
      'Acceso denegado. Solo usuarios @verifactu.business pueden acceder',
    Verification: 'Error de verificación',
    Default: 'Ha ocurrido un error durante la autenticación',
  };

  const errorMessage = errorMessages[error || 'Default'] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Error de autenticación
          </h1>
          <p className="text-slate-600">{errorMessage}</p>
        </div>

        {error === 'AccessDenied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-900">
                  Acceso restringido
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Este panel es solo para miembros del equipo Verifactu Business
                  con cuenta @verifactu.business
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/auth/signin"
            className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Intentar de nuevo
          </a>
          <a
            href="mailto:soporte@verifactu.business"
            className="block w-full px-4 py-3 bg-slate-100 text-slate-700 text-center rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}
