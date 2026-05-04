import {
  ArrowRight,
  BookOpen,
  Code2,
  FlaskConical,
  Key,
  Lock,
  MessageSquare,
  Terminal,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Developers | Isaak Platform API — Verifactu Business',
  description:
    'Conecta tu software a Isaak. API REST y protocolo MCP para automatizar facturas, VeriFactu y contabilidad en tiempo real.',
  openGraph: {
    title: 'Isaak Platform API — Developers',
    description:
      'Conecta tu software a Isaak. API REST y protocolo MCP para automatizar facturas, VeriFactu y contabilidad en tiempo real.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/developers',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

// ─── Static code blocks ───────────────────────────────────────────────────────

const QUICKSTART_CURL = `# 1. Lista tus facturas
curl https://isaak.verifactu.business/api/v1/invoices \\
  -H "Authorization: Bearer isk_live_TU_API_KEY"

# 2. Crea un borrador
curl -X POST https://isaak.verifactu.business/api/v1/invoices \\
  -H "Authorization: Bearer isk_live_TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientName": "Cliente SL",
    "clientNif": "B87654321",
    "lines": [{ "description": "Consultoría", "quantity": 1, "unitPrice": 1000 }]
  }'

# 3. Emite a AEAT (requiere confirmación)
curl -X POST https://isaak.verifactu.business/api/v1/invoices/FACTURA_ID/issue \\
  -H "Authorization: Bearer isk_live_TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "confirmationToken": "TOKEN_DEL_PASO_PREVIO" }'`;

const MCP_CONFIG = `{
  "mcpServers": {
    "isaak": {
      "url": "https://isaak.verifactu.business/api/mcp/isaak",
      "headers": {
        "Authorization": "Bearer isk_live_TU_API_KEY"
      }
    }
  }
}`;

// ─── Endpoint list ─────────────────────────────────────────────────────────────

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/companies/current',
    description: 'Datos fiscales de la empresa activa',
    scope: 'company.read',
  },
  {
    method: 'GET',
    path: '/api/v1/invoices',
    description: 'Listado de facturas con filtros opcionales',
    scope: 'invoices.read',
  },
  {
    method: 'POST',
    path: '/api/v1/invoices',
    description: 'Crear borrador de factura',
    scope: 'invoices.write',
  },
  {
    method: 'GET',
    path: '/api/v1/invoices/:id',
    description: 'Detalle completo de una factura',
    scope: 'invoices.read',
  },
  {
    method: 'GET',
    path: '/api/v1/invoices/:id/pdf',
    description: 'PDF firmado con QR VeriFactu',
    scope: 'invoices.read',
  },
  {
    method: 'POST',
    path: '/api/v1/invoices/:id/issue',
    description: 'Emitir factura a AEAT (irreversible, requiere token)',
    scope: 'invoices.issue',
  },
  {
    method: 'GET',
    path: '/api/v1/verifactu/status',
    description: 'Estado del servicio VeriFactu y registros AEAT',
    scope: 'verifactu.read',
  },
  {
    method: 'GET',
    path: '/api/v1/audit/events',
    description: 'Historial de acciones (auditoría)',
    scope: 'audit.read',
  },
  {
    method: 'GET',
    path: '/api/v1/keys',
    description: 'Listar tus API keys activas',
    scope: 'keys.read',
  },
  {
    method: 'POST',
    path: '/api/v1/keys',
    description: 'Crear nueva API key',
    scope: 'keys.write',
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  PATCH: 'bg-amber-100 text-amber-800',
};

// ─── MCP Tools list ────────────────────────────────────────────────────────────

const MCP_TOOLS = [
  { name: 'isaak_get_company_context', description: 'Obtiene el contexto fiscal de la empresa' },
  { name: 'isaak_list_invoices', description: 'Lista facturas con filtros de fecha y estado' },
  { name: 'isaak_get_invoice', description: 'Detalle de una factura por ID o número' },
  { name: 'isaak_create_invoice_draft', description: 'Crea un borrador de factura' },
  { name: 'isaak_validate_verifactu_invoice', description: 'Valida datos antes de emitir a AEAT' },
  {
    name: 'isaak_issue_verifactu_invoice',
    description: 'Emite la factura a AEAT (con confirmación)',
  },
  { name: 'isaak_get_verifactu_status', description: 'Estado del registro en AEAT' },
  { name: 'isaak_get_fiscal_summary', description: 'Resumen fiscal del periodo' },
  { name: 'isaak_propose_action', description: 'Propone acciones fiscales a Isaak' },
];

// ─── MCP Inspector code blocks ────────────────────────────────────────────────

const INSPECTOR_LAUNCH = `npx @modelcontextprotocol/inspector@latest`;

const INSPECTOR_CLAUDE_STEPS = `# En el Inspector UI:
# Transport: Streamable HTTP
# URL:       https://claude.verifactu.business/mcp
#
# → Pulsa Connect → completa el OAuth con tu API key de Holded
# → Verás 24 tools listadas con readOnlyHint / writeAnnotations`;

const INSPECTOR_CHATGPT_LOCAL = `# 1. Arranca apps/app en local
pnpm --dir apps/app dev

# 2. En el Inspector UI:
# Transport: Streamable HTTP
# URL:       http://localhost:3000/api/mcp/holded
# Header:    Authorization: Bearer <MCP_SHARED_SECRET de .env.local>`;

const INSPECTOR_ISAAK = `# En el Inspector UI:
# Transport: Streamable HTTP
# URL:       https://isaak.verifactu.business/api/mcp/isaak
# Header:    Authorization: Bearer isk_live_TU_API_KEY`;

const INSPECTOR_TROUBLESHOOT = `# Puerto 6277 ocupado (Windows)
netstat -ano | findstr ":6274 :6277" | for /f "tokens=5" %P in ('more') do taskkill /PID %P /F

# Puerto 6277 ocupado (macOS / Linux)
lsof -ti :6274,:6277 | xargs kill -9`;

const INSPECTOR_CONNECTORS = [
  {
    id: 'claude',
    label: 'Conector Claude',
    url: 'https://claude.verifactu.business/mcp',
    auth: 'OAuth 2.0 DCR (el Inspector gestiona el flujo automáticamente)',
    tools: '24 tools — 23 read-only + create_invoice_draft',
    hint: 'Pulsa Connect → la página OAuth se abre en el navegador → introduce tu API key de Holded → autoriza.',
    code: INSPECTOR_CLAUDE_STEPS,
  },
  {
    id: 'chatgpt',
    label: 'Conector ChatGPT',
    url: 'http://localhost:3000/api/mcp/holded (local)',
    auth: 'Bearer MCP_SHARED_SECRET (en .env.local)',
    tools: '70+ tools (preset holded_priority1 en modo shared_secret)',
    hint: 'Requiere apps/app corriendo en local. Añade Authorization header en el Inspector antes de conectar.',
    code: INSPECTOR_CHATGPT_LOCAL,
  },
  {
    id: 'isaak',
    label: 'Servidor Isaak MCP',
    url: 'https://isaak.verifactu.business/api/mcp/isaak',
    auth: 'Bearer isk_live_TU_API_KEY',
    tools: '9 tools — facturas, VeriFactu, resumen fiscal',
    hint: 'Añade Authorization header con tu API key antes de conectar. tools/list es público.',
    code: INSPECTOR_ISAAK,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Code2 className="h-3.5 w-3.5" />
              Isaak Platform API · Beta
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              Conecta tu software a Isaak.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              API REST y protocolo MCP para automatizar facturas, emisión a VeriFactu y contabilidad
              en tiempo real. Integra en minutos desde cualquier entorno.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#quickstart"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Empezar en 5 minutos
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="https://isaak.verifactu.business/dashboard/settings/api-keys"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                <Key className="h-4 w-4" />
                Obtener API key
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Overview cards ──────────────────────────────────────────────────── */}
      <section className="py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: <Terminal className="h-5 w-5 text-[#2361d8]" />,
                title: 'REST API',
                body: '10 endpoints REST. Autenticación Bearer. Respuestas JSON consistentes. Compatible con cualquier lenguaje.',
                href: '#endpoints',
                cta: 'Ver endpoints',
              },
              {
                icon: <MessageSquare className="h-5 w-5 text-[#2361d8]" />,
                title: 'Protocolo MCP',
                body: 'Conecta Claude, ChatGPT u otro agente. 9 herramientas que Isaak entiende de forma nativa.',
                href: '#mcp',
                cta: 'Ver MCP tools',
              },
              {
                icon: <Zap className="h-5 w-5 text-[#2361d8]" />,
                title: 'Acceso beta',
                body: 'Solicita acceso anticipado. API keys disponibles desde tu cuenta. Sin límite durante la fase beta.',
                href: 'https://isaak.verifactu.business',
                cta: 'Solicitar acceso',
              },
              {
                icon: <FlaskConical className="h-5 w-5 text-[#2361d8]" />,
                title: 'MCP Inspector',
                body: 'Depura cualquier conector MCP desde el navegador. Un solo comando, sin instalación. Compatible con Claude, ChatGPT e Isaak.',
                href: '#inspector',
                cta: 'Cómo usar el Inspector',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2361d8]/8">
                  {card.icon}
                </div>
                <h2 className="text-base font-semibold text-[#011c67]">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                <a
                  href={card.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Authentication ──────────────────────────────────────────────────── */}
      <section id="auth" className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Lock className="h-4 w-4" />
              Autenticación
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
              Bearer token en cada petición
            </h2>
            <p className="mt-3 text-slate-600">
              Todas las peticiones requieren un API key en la cabecera{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
                Authorization
              </code>
              . Las keys se crean desde tu panel de Isaak y pueden revocarse en cualquier momento.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Producción
                </div>
                <code className="text-sm font-mono text-slate-800">
                  Authorization: Bearer isk_live_...
                </code>
                <p className="mt-2 text-xs text-slate-500">
                  Acceso real a datos de tu empresa. Acciones hacia AEAT son definitivas.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Test / Sandbox
                </div>
                <code className="text-sm font-mono text-slate-800">
                  Authorization: Bearer isk_test_...
                </code>
                <p className="mt-2 text-xs text-slate-500">
                  Datos simulados. Las emisiones a VeriFactu no se registran en AEAT.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Acciones irreversibles:</strong> Los endpoints que envían datos a AEAT
              requieren un paso de confirmación en dos tiempos. La primera llamada devuelve un
              preview y un token temporal; la segunda confirma la acción.
            </div>
          </div>
        </Container>
      </section>

      {/* ── Quickstart ──────────────────────────────────────────────────────── */}
      <section id="quickstart" className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Terminal className="h-4 w-4" />
              Quickstart
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
              Tu primera factura en 5 minutos
            </h2>
            <p className="mt-3 text-slate-600">
              Solo necesitas tu API key. El flujo completo: listar → crear borrador → emitir a AEAT.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">Terminal</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{QUICKSTART_CURL}</code>
              </pre>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Consulta la{' '}
              <a href="#endpoints" className="font-medium text-[#2361d8] hover:underline">
                referencia completa de endpoints
              </a>{' '}
              para ver todos los parámetros disponibles.
            </p>
          </div>
        </Container>
      </section>

      {/* ── Endpoints ───────────────────────────────────────────────────────── */}
      <section id="endpoints" className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <BookOpen className="h-4 w-4" />
              Referencia API
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
              Endpoints disponibles
            </h2>
            <p className="mt-3 text-slate-600">
              Base URL:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
                https://isaak.verifactu.business
              </code>
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Método
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Endpoint
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                      Descripción
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">
                      Scope
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[ep.method] ?? 'bg-slate-100 text-slate-700'}`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-slate-800">{ep.path}</code>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {ep.description}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                          {ep.scope}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Todas las respuestas siguen el formato estándar:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                {'{ "ok": true, "data": {}, "meta": { "requestId": "...", "timestamp": "..." } }'}
              </code>
            </p>
          </div>
        </Container>
      </section>

      {/* ── MCP ─────────────────────────────────────────────────────────────── */}
      <section id="mcp" className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <MessageSquare className="h-4 w-4" />
              MCP — Model Context Protocol
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
              Conecta Claude o ChatGPT a tu empresa
            </h2>
            <p className="mt-3 text-slate-600">
              El servidor MCP de Isaak expone 9 herramientas que cualquier agente compatible puede
              usar para leer y actuar sobre tus datos fiscales. Funciona con Claude Desktop, Claude
              API y ChatGPT con conectores personalizados.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">
                  claude_desktop_config.json
                </span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-6 text-sm leading-7 text-slate-200">
                <code>{MCP_CONFIG}</code>
              </pre>
            </div>

            <h3 className="mt-10 text-lg font-semibold text-[#011c67]">Herramientas disponibles</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {MCP_TOOLS.map((tool) => (
                <div key={tool.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <code className="text-xs font-mono font-semibold text-[#2361d8]">
                    {tool.name}
                  </code>
                  <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── MCP Inspector ──────────────────────────────────────────────────── */}
      <section id="inspector" className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <FlaskConical className="h-4 w-4" />
              MCP Inspector
            </div>
            <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
              Inspecciona y prueba cualquier conector MCP desde el navegador
            </h2>
            <p className="mt-3 text-slate-600">
              El MCP Inspector es la herramienta oficial de debug del protocolo. Sin instalación —
              solo{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
                npx
              </code>
              . Conecta a cualquiera de los tres servidores MCP disponibles, ve los tools en tiempo
              real y ejecuta llamadas directamente desde la UI.
            </p>

            {/* Launch command */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-medium text-slate-400">
                  Terminal — lanzar Inspector
                </span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-5 text-sm text-slate-200">
                <code>{INSPECTOR_LAUNCH}</code>
              </pre>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              El Inspector arranca en{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
                http://localhost:6274
              </code>
              . Copia la URL con el token que imprime en la consola.
            </p>

            {/* Connector cards */}
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {INSPECTOR_CONNECTORS.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 text-sm font-semibold text-[#011c67]">{c.label}</div>
                  <dl className="space-y-2 text-xs text-slate-600">
                    <div>
                      <dt className="font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        URL
                      </dt>
                      <dd>
                        <code className="break-all font-mono text-[#2361d8]">{c.url}</code>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        Auth
                      </dt>
                      <dd>{c.auth}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                        Tools
                      </dt>
                      <dd>{c.tools}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {c.hint}
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-[#2361d8] hover:underline select-none">
                      Ver pasos en terminal
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs leading-6 text-slate-300">
                      <code>{c.code}</code>
                    </pre>
                  </details>
                </div>
              ))}
            </div>

            {/* Troubleshoot */}
            <h3 className="mt-10 text-base font-semibold text-[#011c67]">
              Resolución de problemas
            </h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
                <span className="text-xs font-medium text-slate-400">Puerto ocupado</span>
              </div>
              <pre className="overflow-x-auto bg-slate-900 p-5 text-xs leading-6 text-slate-300">
                <code>{INSPECTOR_TROUBLESHOOT}</code>
              </pre>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Guía técnica completa →{' '}
              <Link
                href="https://isaak.verifactu.business/developers"
                className="font-medium text-[#2361d8] hover:underline"
              >
                isaak.verifactu.business/developers
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Empieza hoy, gratis durante la beta.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Crea una cuenta, genera tu primera API key y conecta en minutos.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="https://isaak.verifactu.business"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Crear cuenta gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Hablar con el equipo
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
