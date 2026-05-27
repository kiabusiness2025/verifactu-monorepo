import { ArrowLeft, Gauge } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';

export const metadata: Metadata = {
  title: 'Rate limits | Isaak Platform API — Verifactu Business',
  description:
    'Límites de peticiones por minuto en la API de Isaak. Política por scope, plan y endpoint. Headers de rate limit y backoff recomendado.',
  alternates: { canonical: '/developers/rate-limits' },
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

const LIMITS = [
  { plan: 'Free', read: '60 / min', write: '10 / min', aeat: '5 / min', mcp: '30 / min' },
  { plan: 'Starter', read: '120 / min', write: '30 / min', aeat: '15 / min', mcp: '60 / min' },
  { plan: 'Pro', read: '300 / min', write: '90 / min', aeat: '60 / min', mcp: '180 / min' },
  { plan: 'Business', read: '600 / min', write: '300 / min', aeat: '120 / min', mcp: '360 / min' },
];

const HEADERS_BLOCK = `# Headers que la API devuelve en cada respuesta 2xx
X-RateLimit-Limit:     300
X-RateLimit-Remaining: 287
X-RateLimit-Reset:     1759320000   # epoch seconds

# Cuando devolvemos 429 Too Many Requests
Retry-After: 23                     # segundos hasta que se libera un slot`;

const BACKOFF_BLOCK = `// Backoff exponencial con jitter
async function withRetry(fn, attempt = 0) {
  try {
    return await fn();
  } catch (err) {
    if (err.status !== 429 && err.status < 500) throw err;
    if (attempt >= 5) throw err;
    const baseMs = Math.min(30_000, 1000 * 2 ** attempt);
    const jitter = Math.random() * 500;
    const wait = err.retryAfter ? err.retryAfter * 1000 : baseMs + jitter;
    await new Promise(r => setTimeout(r, wait));
    return withRetry(fn, attempt + 1);
  }
}`;

export default function RateLimitsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-14 sm:py-16">
        <Container>
          <div className="max-w-4xl">
            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2361d8] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Developers
            </Link>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Gauge className="h-3.5 w-3.5" />
              Rate limits · Política
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Rate limits
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Isaak aplica límites por token y por familia de endpoint para proteger AEAT y la
              experiencia compartida. Los límites escalan con el plan del tenant.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-5xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Límites por plan</h2>
            <p className="mt-3 text-slate-600">
              Por token y por minuto. Las llamadas dentro del mismo tenant se suman entre todas las
              keys activas.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Read</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Write</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">AEAT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">MCP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LIMITS.map((row) => (
                    <tr key={row.plan} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-[#011c67]">{row.plan}</td>
                      <td className="px-4 py-3 text-slate-700">{row.read}</td>
                      <td className="px-4 py-3 text-slate-700">{row.write}</td>
                      <td className="px-4 py-3 text-slate-700">{row.aeat}</td>
                      <td className="px-4 py-3 text-slate-700">{row.mcp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              <strong>Read</strong> = GETs sobre facturas, contactos, fiscal.{' '}
              <strong>Write</strong> = POST/PATCH sobre borradores.{' '}
              <strong>AEAT</strong> = emisiones VeriFactu / validaciones contra AEAT.{' '}
              <strong>MCP</strong> = llamadas tools/call al servidor MCP.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Headers de rate limit</h2>
            <p className="mt-3 text-slate-600">
              La API expone tres headers de inspección y un header de retry. Úsalos para evitar 429
              proactivamente en lugar de reactivamente.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">HTTP</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{HEADERS_BLOCK}</code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Backoff exponencial</h2>
            <p className="mt-3 text-slate-600">
              Recomendamos backoff exponencial con jitter para errores <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">429</code>{' '}
              y <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">5xx</code>. Respeta siempre el header{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">Retry-After</code> cuando esté presente.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">JavaScript</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{BACKOFF_BLOCK}</code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-12">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#011c67]">Burst y fairness</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li>
                Permitimos burst de hasta <strong className="text-slate-900">2× el límite</strong>{' '}
                durante 10 segundos, después se aplica el ratio sostenido.
              </li>
              <li>
                AEAT tiene su propio ratio compartido entre todos los tenants. En picos
                concurrentes, una emisión puede esperar en cola interna hasta 60s.
              </li>
              <li>
                Si necesitas límites superiores (ej. integración batch nocturna) escribe a{' '}
                <a
                  href="mailto:soporte@verifactu.business?subject=Ampliar%20rate%20limit%20API"
                  className="text-[#2361d8] hover:underline"
                >
                  soporte@verifactu.business
                </a>
                . Ampliamos cuotas caso por caso para Pro y Business.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
