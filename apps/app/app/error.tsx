"use client";

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const monitorEnabled = process.env.NEXT_PUBLIC_MONITOR_ENABLED === 'true';
    const monitorToken = process.env.NEXT_PUBLIC_MONITOR_TOKEN;
    if (!monitorEnabled && !monitorToken) return;

    // Reportar error a sistema de monitoreo
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (monitorToken) {
      headers['x-monitor-token'] = monitorToken;
    }

    fetch('/api/monitor/error', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        errors: [
          {
            type: 'runtime_error',
            details: {
              message: error.message,
              stack: error.stack,
              digest: error.digest,
            },
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        ],
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      })
    }).catch(console.error);
  }, [error]);

  const landingHome = (process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business').replace(/\/$/, '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Algo salió mal</h2>
        
        <p className="text-gray-600 mb-8">
          Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado y está trabajando en solucionarlo.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
          
          <a
            href={landingHome}
            className="block w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Volver al Inicio
          </a>
        </div>

        <details className="mt-8 text-left">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Detalles técnicos
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40 text-left">
            {error.digest ? `digest: ${error.digest}\n` : ''}
            {error.message}
          </pre>
        </details>

        <p className="text-xs text-gray-500 mt-4">
          Error reportado automáticamente • Isaak está generando fix
        </p>
      </div>
    </div>
  );
}
