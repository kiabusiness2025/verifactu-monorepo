"use client";

import { useState } from 'react';
import { Send, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type EmailType = 'verification' | 'welcome' | 'password-reset' | 'password-changed' | 'team-invite' | 'all';

type TestResult = {
  success: boolean;
  message?: string;
  results?: Record<string, any>;
  error?: string;
};

export default function EmailTestPage() {
  const [testEmail, setTestEmail] = useState('expertestudiospro@gmail.com');
  const [selectedType, setSelectedType] = useState<EmailType>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const emailTypes: { value: EmailType; label: string; description: string }[] = [
    { value: 'all', label: '🎯 Todos los emails', description: 'Enviar todos los tipos de email' },
    { value: 'verification', label: '✉️ Verificación', description: 'Email de verificación de cuenta' },
    { value: 'welcome', label: '👋 Bienvenida', description: 'Email de bienvenida post-registro' },
    { value: 'password-reset', label: '🔑 Reset contraseña', description: 'Email de recuperación de contraseña' },
    { value: 'password-changed', label: '✅ Contraseña cambiada', description: 'Confirmación de cambio' },
    { value: 'team-invite', label: '👥 Invitación', description: 'Email de invitación a equipo' }
  ];

  const sendTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: selectedType === 'all' ? undefined : selectedType,
          testEmail
        })
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            Probador de Emails
          </h1>
          <p className="mt-2 text-gray-600">
            Prueba todos los flujos de emails de Verifactu en local
          </p>
        </div>

        {/* Advertencia de desarrollo */}
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Solo disponible en desarrollo.</strong> Este endpoint no funciona en producción por seguridad.
          </p>
        </div>

        {/* Configuración */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>

          {/* Email destino */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de prueba
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu-email@ejemplo.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              El email se enviará a esta dirección
            </p>
          </div>

          {/* Tipo de email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de email
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {emailTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 text-left rounded-lg border-2 transition-all ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Botón enviar */}
          <button
            onClick={sendTestEmail}
            disabled={loading || !testEmail}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Email de Prueba
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {result && (
          <div className={`rounded-xl shadow-sm border p-6 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <h3 className={`text-lg font-semibold ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? '✅ Email(s) enviado(s)' : '❌ Error al enviar'}
              </h3>
            </div>

            {result.message && (
              <p className={`text-sm mb-4 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </p>
            )}

            {result.error && (
              <p className="text-sm text-red-800 mb-4">
                <strong>Error:</strong> {result.error}
              </p>
            )}

            {result.results && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Detalle por tipo:</p>
                {Object.entries(result.results).map(([type, res]: [string, any]) => (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    {res.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-mono text-gray-700">{type}</span>
                    {res.messageId && (
                      <span className="text-xs text-gray-500">
                        (ID: {res.messageId})
                      </span>
                    )}
                    {res.error && (
                      <span className="text-xs text-red-600">
                        Error: {res.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Revisa tu bandeja de entrada en <code className="bg-gray-100 px-1 py-0.5 rounded">{testEmail}</code>
              </p>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Checklist de Verificación
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>RESEND_API_KEY</strong> configurado en .env.local</li>
            <li>✅ <strong>EMAIL_FROM_NOREPLY</strong> configurado (para login/registro)</li>
            <li>✅ <strong>EMAIL_FROM_SUPPORT</strong> configurado (para soporte)</li>
            <li>✅ Dominio verificado en Resend Dashboard</li>
            <li>✅ Servidor de desarrollo corriendo (pnpm dev)</li>
          </ul>

          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> Los emails pueden tardar unos segundos en llegar. 
              Si no recibes ningún email, verifica la consola del servidor para errores.
            </p>
          </div>
        </div>

        {/* Testing con cURL */}
        <div className="mt-6 bg-gray-900 text-gray-100 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3">🔧 Testing con cURL</h3>
          <pre className="text-xs overflow-x-auto bg-gray-800 p-4 rounded-lg">
{`# Enviar todos los emails
curl -X POST http://localhost:3000/api/test/emails \\
  -H "Content-Type: application/json" \\
  -d '{"testEmail": "expertestudiospro@gmail.com"}'

# Enviar solo verificación
curl -X POST http://localhost:3000/api/test/emails \\
  -H "Content-Type: application/json" \\
  -d '{"emailType": "verification", "testEmail": "expertestudiospro@gmail.com"}'

# Ver info del endpoint
curl http://localhost:3000/api/test/emails`}
          </pre>
        </div>
      </div>
    </div>
  );
}
