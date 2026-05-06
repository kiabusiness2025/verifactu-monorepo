'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

const HOLDED_API_KEY_HELP_URL = 'https://support.holded.com/hc/es/articles/360009694799';

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_FIELDS: 'Por favor, completa el email y la API key.',
  TERMS_NOT_ACCEPTED: 'Debes aceptar los términos y la política de privacidad para continuar.',
  INVALID_EMAIL: 'El email no tiene un formato válido.',
  INVALID_API_KEY:
    'La API key no es válida o no tiene los permisos necesarios. Comprueba que sea correcta en Holded.',
  PROBE_ERROR: 'No se pudo conectar con Holded. Inténtalo de nuevo en unos segundos.',
  DB_ERROR: 'Error interno. Por favor, contacta con soporte.',
  SESSION_ERROR: 'Error al iniciar sesión. Por favor, inténtalo de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.',
};

function HoldedDirectLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || `${HOLDED_SITE_URL}/dashboard`;
  const source = searchParams.get('source') || 'holded_direct';

  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void source;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !apiKey.trim()) {
      setError(ERROR_MESSAGES.MISSING_FIELDS);
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/holded-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          apiKey: apiKey.trim(),
          acceptedTerms,
          acceptedPrivacy,
          next,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; redirectUrl?: string; error?: string };

      if (!res.ok || !data.ok) {
        const code = data.error ?? 'DB_ERROR';
        setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.DB_ERROR);
        setLoading(false);
        return;
      }

      window.location.replace(data.redirectUrl ?? next);
    } catch {
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="Verifactu" width={140} height={40} priority />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">Conecta tu cuenta Holded</h1>
            <p className="text-sm text-gray-500">
              Introduce tu email y tu API key de Holded para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                  API key de Holded
                </label>
                <a
                  href={HOLDED_API_KEY_HELP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  ¿Dónde la encuentro?
                </a>
              </div>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  autoComplete="off"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  Acepto los{' '}
                  <a
                    href={`${HOLDED_SITE_URL}/terms`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    términos de uso
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  Acepto la{' '}
                  <a
                    href={`${HOLDED_SITE_URL}/privacy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    política de privacidad
                  </a>
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Conectando…' : 'Continuar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          ¿Necesitas ayuda?{' '}
          <a href={`mailto:soporte@verifactu.business`} className="text-blue-600 hover:underline">
            soporte@verifactu.business
          </a>
        </p>
      </div>
    </div>
  );
}

export default function HoldedDirectLoginPage() {
  return (
    <Suspense>
      <HoldedDirectLoginForm />
    </Suspense>
  );
}
