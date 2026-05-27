import { ArrowLeft, Webhook } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';

export const metadata: Metadata = {
  title: 'Webhooks | Isaak Platform API — Verifactu Business',
  description:
    'Eventos en tiempo real desde Isaak: factura emitida, validación AEAT, certificado a punto de caducar. Firmas HMAC, reintentos y catálogo de eventos.',
  alternates: { canonical: '/developers/webhooks' },
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

const EVENT_PAYLOAD = `{
  "id": "evt_2026_05_27_abc123",
  "type": "invoice.issued",
  "createdAt": "2026-05-27T10:23:45.000Z",
  "tenantId": "tnt_xxx",
  "data": {
    "invoiceId": "inv_2026_0042",
    "number": "2026/0042",
    "amount": 1210.00,
    "verifactuHash": "a1b2c3d4...",
    "aeatStatus": "registered"
  }
}`;

const SIGNATURE_BLOCK = `// Verificación de firma HMAC (Node.js)
import crypto from 'node:crypto';

function verifyWebhook(req, secret) {
  const signature = req.headers['x-isaak-signature'];
  const timestamp = req.headers['x-isaak-timestamp'];
  const body = req.rawBody; // ¡el cuerpo crudo, NO parseado!

  // Rechazar si la firma tiene más de 5 minutos (anti-replay)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error('Timestamp fuera de ventana');
  }

  const payload = \`\${timestamp}.\${body}\`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Firma inválida');
  }
}`;

const EVENTS = [
  {
    type: 'invoice.draft.created',
    when: 'Un borrador de factura ha sido creado (vía API, MCP o dashboard).',
    scope: 'invoices.read',
  },
  {
    type: 'invoice.issued',
    when: 'Factura emitida y registrada con éxito en AEAT (VeriFactu).',
    scope: 'invoices.read',
  },
  {
    type: 'invoice.rejected',
    when: 'AEAT rechazó el registro. El campo `data.reason` indica el motivo.',
    scope: 'invoices.read',
  },
  {
    type: 'invoice.cancelled',
    when: 'Factura rectificativa emitida sobre una previa.',
    scope: 'invoices.read',
  },
  {
    type: 'verifactu.status.changed',
    when: 'Cambio en el estado de comunicación con AEAT (alta, baja, mantenimiento).',
    scope: 'verifactu.read',
  },
  {
    type: 'certificate.expiring',
    when: 'Certificado mTLS a 30, 15 o 7 días de caducar. Aviso recurrente hasta renovar.',
    scope: 'company.read',
  },
  {
    type: 'banking.transaction.matched',
    when: 'Una transacción bancaria se ha conciliado automáticamente con una factura.',
    scope: 'fiscal.read',
  },
  {
    type: 'api_key.created',
    when: 'Nueva API key creada en el tenant. Útil para auditoría.',
    scope: 'audit.read',
  },
  {
    type: 'api_key.revoked',
    when: 'API key revocada (manual o por rotación automática).',
    scope: 'audit.read',
  },
];

export default function WebhooksPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4fff8_0%,#ffffff_70%)] py-14 sm:py-16">
        <Container>
          <div className="max-w-4xl">
            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2361d8] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Developers
            </Link>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Webhook className="h-3.5 w-3.5" />
              Webhooks · Beta cerrada
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Eventos en tiempo real
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Isaak puede enviar eventos POST a tu URL cuando algo cambia: factura emitida,
              validación AEAT, certificado a punto de caducar. La beta de webhooks está abierta
              caso por caso —{' '}
              <a
                href="mailto:soporte@verifactu.business?subject=Acceso%20beta%20Webhooks%20Isaak"
                className="text-[#2361d8] hover:underline"
              >
                pide acceso a soporte@verifactu.business
              </a>
              .
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Formato del payload</h2>
            <p className="mt-3 text-slate-600">
              Todos los eventos comparten la misma envoltura. El campo{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">type</code> identifica el
              evento y <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">data</code> contiene
              el snapshot relevante.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">application/json</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{EVENT_PAYLOAD}</code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Firma HMAC</h2>
            <p className="mt-3 text-slate-600">
              Cada petición incluye un header{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">X-Isaak-Signature</code> con HMAC-SHA256
              del cuerpo crudo concatenado con el timestamp. Verifica siempre la firma antes de
              confiar en el payload.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">Node.js</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{SIGNATURE_BLOCK}</code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-5xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Catálogo de eventos</h2>
            <p className="mt-3 text-slate-600">
              Selecciona los eventos a los que quieres suscribirte al crear el endpoint. Los scopes
              de la API key que firma el webhook controlan qué eventos puedes recibir.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Evento</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Disparador</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">Scope requerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EVENTS.map((ev) => (
                    <tr key={ev.type} className="align-top hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono font-semibold text-[#011c67]">{ev.type}</code>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{ev.when}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                          isaak.{ev.scope}
                        </code>
                      </td>
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
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Entrega y reintentos</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li>
                Esperamos un <strong className="text-slate-900">2xx en menos de 10s</strong>. Si tu
                endpoint tarda más, devuelve 200 de inmediato y procesa de forma asíncrona.
              </li>
              <li>
                Si la respuesta no es 2xx, reintentamos con backoff exponencial: <strong>1m, 5m, 30m, 2h, 12h</strong>.
                Tras 5 intentos fallidos, el evento se marca como <em>dead-letter</em> y queda
                disponible en el dashboard de Isaak para reenvío manual.
              </li>
              <li>
                Los eventos pueden llegar <strong className="text-slate-900">duplicados</strong>. Usa
                el campo <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">id</code> para deduplicar.
              </li>
              <li>
                Los eventos pueden llegar <strong className="text-slate-900">desordenados</strong>.
                Confía en <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">createdAt</code>, no en el orden de recepción.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
