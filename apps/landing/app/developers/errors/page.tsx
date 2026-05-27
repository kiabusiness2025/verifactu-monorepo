import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';

export const metadata: Metadata = {
  title: 'Error codes | Isaak Platform API — Verifactu Business',
  description:
    'Referencia de códigos de error de la API REST de Isaak Platform. Códigos HTTP, formato del envelope y guía de manejo.',
  alternates: { canonical: '/developers/errors' },
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

const ERROR_ENVELOPE = `{
  "ok": false,
  "error": {
    "code": "scope_insufficient",
    "message": "El token no tiene scope 'isaak.invoices.write'."
  },
  "requestId": "req_2026_01_15_abc123"
}`;

const HTTP_STATUS = [
  {
    status: 400,
    code: 'bad_request',
    when: 'Body o query string mal formado (JSON inválido, parámetros incompatibles).',
    fix: 'Validar el payload contra el OpenAPI spec antes de enviar.',
  },
  {
    status: 401,
    code: 'unauthorized',
    when: 'Token ausente, mal formado, expirado o revocado.',
    fix: 'Comprobar el header Authorization. Renovar la API key desde el dashboard.',
  },
  {
    status: 403,
    code: 'scope_insufficient',
    when: 'El token es válido pero no tiene el scope requerido para esa ruta.',
    fix: 'Crear una nueva API key con el scope correcto (ej. isaak.invoices.write).',
  },
  {
    status: 404,
    code: 'not_found',
    when: 'El recurso solicitado (factura, contacto, etc.) no existe o no pertenece a tu tenant.',
    fix: 'Verificar el ID. Recursos de otros tenants devuelven 404 (no 403) por seguridad.',
  },
  {
    status: 409,
    code: 'conflict',
    when: 'Estado del recurso incompatible con la acción (ej. emitir factura ya emitida).',
    fix: 'Releer el estado actual con GET antes de reintentar.',
  },
  {
    status: 422,
    code: 'validation_error',
    when: 'Datos válidos sintácticamente pero no semánticamente (NIF inválido, fecha futura, etc.).',
    fix: 'El campo `error.message` indica qué falla. Corregir y reintentar.',
  },
  {
    status: 428,
    code: 'confirmation_required',
    when: 'La acción es irreversible (emisión AEAT). Se requiere un segundo POST con el confirmationToken.',
    fix: 'Mostrar el `preview` al usuario, capturar consentimiento, reenviar con el token.',
  },
  {
    status: 429,
    code: 'rate_limit_exceeded',
    when: 'Has superado el límite de peticiones por minuto.',
    fix: 'Respetar el header Retry-After. Implementar backoff exponencial.',
  },
  {
    status: 500,
    code: 'internal_error',
    when: 'Error inesperado en Isaak. Si persiste, reportar el `requestId`.',
    fix: 'Reintentar con backoff. Si pasa varias veces, escribir a soporte@verifactu.business.',
  },
  {
    status: 502,
    code: 'aeat_unavailable',
    when: 'AEAT no responde o devuelve error temporal en el SOAP.',
    fix: 'Reintentar a los 30s. Isaak no marca la factura como fallida hasta varios intentos.',
  },
  {
    status: 503,
    code: 'maintenance',
    when: 'Mantenimiento programado. Verifactu publica avisos en status.verifactu.business.',
    fix: 'Reintentar pasada la ventana. Esperar el header Retry-After si lo hay.',
  },
];

const APP_CODES = [
  { code: 'aeat_rejected', desc: 'AEAT rechazó el registro VeriFactu por validación oficial.' },
  { code: 'aeat_duplicate', desc: 'Hash VeriFactu ya presente. Implica reenvío de factura emitida.' },
  { code: 'confirmation_token_expired', desc: 'El token de confirmación caducó (TTL 5 min).' },
  { code: 'plan_required', desc: 'La ruta requiere un plan superior (típicamente Business).' },
  { code: 'tenant_blocked', desc: 'El tenant está suspendido. Contactar a soporte.' },
  { code: 'key_revoked', desc: 'La API key fue revocada manualmente desde el dashboard.' },
  { code: 'certificate_missing', desc: 'No hay certificado mTLS configurado para emitir a AEAT.' },
  { code: 'idempotency_replay', desc: 'Idempotency-Key ya usada con un payload distinto.' },
];

export default function ErrorsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff8f4_0%,#ffffff_70%)] py-14 sm:py-16">
        <Container>
          <div className="max-w-4xl">
            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2361d8] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Developers
            </Link>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Error codes · Referencia
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Manejo de errores
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Toda la API REST de Isaak devuelve errores con el mismo envelope. Los códigos HTTP
              indican la familia; el campo <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">error.code</code> identifica el motivo exacto.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Formato del envelope</h2>
            <p className="mt-3 text-slate-600">
              Cuando <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">ok = false</code>, la respuesta sigue siempre este shape. El campo{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">requestId</code> permite correlacionar con nuestros logs si abres un ticket.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">application/json</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{ERROR_ENVELOPE}</code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-5xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Códigos HTTP</h2>
            <p className="mt-3 text-slate-600">
              El status HTTP indica la familia del error. Usa <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">error.code</code> para discriminar dentro de cada familia.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">error.code</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Cuándo</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">Acción recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {HTTP_STATUS.map((row) => (
                    <tr key={row.status} className="align-top hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-slate-800">{row.code}</code>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{row.when}</td>
                      <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{row.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-5xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Códigos de aplicación</h2>
            <p className="mt-3 text-slate-600">
              Valores específicos del campo <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">error.code</code> que conviene
              tratar de forma explícita en el cliente.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {APP_CODES.map((row) => (
                <div key={row.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <code className="text-xs font-mono font-semibold text-[#011c67]">{row.code}</code>
                  <p className="mt-1 text-sm text-slate-600">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Retry y backoff</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li>
                <strong className="text-slate-900">5xx, 429, 502</strong> son <em>safe to retry</em>{' '}
                con backoff exponencial. Empieza en 1s y duplica hasta un máximo de 30s.
              </li>
              <li>
                <strong className="text-slate-900">4xx</strong> (excepto 429) requieren cambio en el
                cliente — no reintentar el mismo payload.
              </li>
              <li>
                Para idempotencia en escrituras, envía un header{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">Idempotency-Key</code> único por intento lógico.
              </li>
              <li>
                Honra siempre el header{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">Retry-After</code> en 429 y 503.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
