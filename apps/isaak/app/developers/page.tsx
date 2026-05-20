import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  ExternalLink,
  FlaskConical,
  Key,
  MessageSquare,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Developers — MCP Inspector | Isaak',
  description:
    'Guía para developers: MCP Inspector, conectores Claude y ChatGPT, referencia de tools de Isaak MCP.',
  alternates: {
    canonical: '/developers',
  },
};

// ─── Code blocks ──────────────────────────────────────────────────────────────

const CMD_LAUNCH = `npx @modelcontextprotocol/inspector@latest`;

const CMD_PORT_WIN = `# Liberar puertos del Inspector (Windows PowerShell)
$ports = @(6274, 6277)
foreach ($port in $ports) {
  $p = (netstat -ano | Select-String ":$port ").ToString().Trim().Split()[-1]
  if ($p) { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue }
}`;

const CMD_PORT_UNIX = `# Liberar puertos del Inspector (macOS / Linux)
lsof -ti :6274,:6277 | xargs kill -9 2>/dev/null || true`;

const CONNECTORS = [
  {
    id: 'claude',
    emoji: '🟣',
    label: 'Conector Holded → Claude',
    subtitle: 'apps/holded-mcp · Vercel · OAuth 2.0 DCR',
    transport: 'Streamable HTTP',
    url: 'https://claude.verifactu.business/mcp',
    auth: 'OAuth 2.0 — el Inspector abre automáticamente la pantalla de autorización.',
    toolCount: '24 tools',
    toolDetail: '23 read-only + create_invoice_draft (draft-only)',
    docUrl: 'https://holded.verifactu.business/conectores/claude/docs',
    steps: [
      'Lanza el Inspector: npx @modelcontextprotocol/inspector@latest',
      'Abre la URL con el token que imprime la consola.',
      'Transport: Streamable HTTP · URL: https://claude.verifactu.business/mcp',
      'Pulsa Connect → la página OAuth se abre en el navegador.',
      'Introduce tu API key de Holded y pulsa Conectar.',
      'Verás 24 tools con readOnlyHint y writeAnnotations.',
    ],
    code: `# Transport: Streamable HTTP
# URL: https://claude.verifactu.business/mcp
#
# → Connect → OAuth abre en el navegador
# → Introduce API key de Holded → Conectar
# → 24 tools listadas`,
    checks: [
      'tools/list devuelve exactamente 24 tools',
      'readOnlyHint: true en los 23 tools de lectura',
      'readOnlyHint: false solo en create_invoice_draft',
      'create_invoice_draft responde con "approveDoc=false enforced"',
    ],
  },
  {
    id: 'chatgpt',
    emoji: '🟢',
    label: 'Conector Holded → ChatGPT',
    subtitle: 'apps/app · Vercel · Bearer / OAuth',
    transport: 'Streamable HTTP',
    url: 'http://localhost:3000/api/mcp/holded',
    auth: 'Bearer MCP_SHARED_SECRET (en apps/app/.env.local)',
    toolCount: '70+ tools',
    toolDetail: 'preset holded_priority1 en modo shared_secret local',
    docUrl: 'https://holded.verifactu.business/conectores/chatgpt/docs',
    steps: [
      'Copia HOLDED_TEST_API_KEY y MCP_SHARED_SECRET a apps/app/.env.local',
      'Arranca: pnpm --dir apps/app dev',
      'Transport: Streamable HTTP · URL: http://localhost:3000/api/mcp/holded',
      'Añade header Authorization: Bearer <MCP_SHARED_SECRET>',
      'Pulsa Connect.',
      'tools/call usa HOLDED_TEST_API_KEY como fuente del tenant.',
    ],
    code: `# apps/app/.env.local
MCP_SHARED_SECRET=dev-inspector-secret
HOLDED_TEST_API_KEY=<tu_api_key_holded>

# Terminal 1
pnpm --dir apps/app dev

# Terminal 2 — Inspector UI
# Transport: Streamable HTTP
# URL: http://localhost:3000/api/mcp/holded
# Header: Authorization: Bearer dev-inspector-secret`,
    checks: [
      'tools/list (GET sin auth) devuelve el catálogo público',
      'tools/call sin Bearer devuelve 401 + WWW-Authenticate',
      'tools/call con Bearer funciona con HOLDED_TEST_API_KEY',
      'El preset activo coincide con MCP_PUBLIC_SCOPE_PRESET',
    ],
  },
  {
    id: 'isaak',
    emoji: '🔵',
    label: 'Servidor Isaak MCP',
    subtitle: 'apps/isaak + apps/app · isaak.verifactu.business',
    transport: 'Streamable HTTP',
    url: 'https://isaak.verifactu.business/api/mcp/isaak',
    auth: 'Bearer isk_live_TU_API_KEY',
    toolCount: '9 tools',
    toolDetail: 'facturas, VeriFactu, resumen fiscal, contexto empresa',
    docUrl: 'https://verifactu.business/developers',
    steps: [
      'Genera una API key en Isaak → Configuración → API keys.',
      'Transport: Streamable HTTP · URL: https://isaak.verifactu.business/api/mcp/isaak',
      'Añade header Authorization: Bearer isk_live_TU_API_KEY',
      'Pulsa Connect.',
      'tools/list muestra las 9 herramientas de Isaak.',
    ],
    code: `# Transport: Streamable HTTP
# URL: https://isaak.verifactu.business/api/mcp/isaak
# Header: Authorization: Bearer isk_live_TU_API_KEY
#
# → Connect → 9 tools listadas`,
    checks: [
      'tools/list devuelve 9 tools de Isaak',
      'isaak_get_company_context responde con datos fiscales',
      'isaak_list_invoices devuelve facturas paginadas',
      'isaak_create_invoice_draft crea un borrador revisable',
    ],
  },
];

const ISAAK_TOOLS = [
  {
    name: 'isaak_get_company_context',
    rw: 'R',
    desc: 'Datos fiscales y configuración de la empresa activa',
  },
  {
    name: 'isaak_list_invoices',
    rw: 'R',
    desc: 'Lista facturas con filtros de fecha, estado y tipo',
  },
  { name: 'isaak_get_invoice', rw: 'R', desc: 'Detalle completo de una factura por ID o número' },
  {
    name: 'isaak_create_invoice_draft',
    rw: 'W',
    desc: 'Crea un borrador de factura (requiere confirmación)',
  },
  {
    name: 'isaak_validate_verifactu_invoice',
    rw: 'R',
    desc: 'Valida datos fiscales antes de emitir a AEAT',
  },
  {
    name: 'isaak_issue_verifactu_invoice',
    rw: 'W',
    desc: 'Emite la factura a AEAT (requiere token de confirmación)',
  },
  {
    name: 'isaak_get_verifactu_status',
    rw: 'R',
    desc: 'Estado del registro en AEAT para una factura',
  },
  {
    name: 'isaak_get_fiscal_summary',
    rw: 'R',
    desc: 'Resumen fiscal del periodo: ventas, gastos, resultado',
  },
  {
    name: 'isaak_propose_action',
    rw: 'R',
    desc: 'Propone la siguiente acción fiscal recomendada por Isaak',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IsaakDevelopersPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Code2 className="h-3.5 w-3.5" />
            Developers · MCP Inspector
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            Inspecciona y prueba los conectores MCP de Isaak
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Tres servidores MCP disponibles: Isaak, Holded para Claude y Holded para ChatGPT. El MCP
            Inspector te permite ver los tools en tiempo real y ejecutar llamadas directamente desde
            el navegador, sin instalación.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#inspector"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1f55c0]"
            >
              <FlaskConical className="h-4 w-4" />
              Usar el Inspector
            </a>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Abrir Isaak
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <FlaskConical className="h-5 w-5 text-[#2361d8]" />,
                title: 'MCP Inspector',
                body: 'Una sola herramienta para probar los tres conectores. Visualiza schemas, ejecuta llamadas y verifica annotations.',
                href: '#inspector',
              },
              {
                icon: <MessageSquare className="h-5 w-5 text-[#2361d8]" />,
                title: 'Tres conectores',
                body: 'Isaak MCP, Holded para Claude y Holded para ChatGPT. Cada uno con su preset de tools, auth y endpoints.',
                href: '#conectores',
              },
              {
                icon: <Wrench className="h-5 w-5 text-[#2361d8]" />,
                title: 'Referencia de tools',
                body: 'Las 9 tools de Isaak documentadas con tipos de entrada/salida. Referencia completa de Holded en docs del conector.',
                href: '#tools',
              },
            ].map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2361d8]/8">
                  {card.icon}
                </div>
                <h2 className="text-sm font-semibold text-[#011c67]">{card.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{card.body}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── MCP Inspector ─────────────────────────────────────────────────── */}
      <section id="inspector" className="border-t border-slate-100 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <FlaskConical className="h-4 w-4" />
            MCP Inspector
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
            Un solo comando para depurar cualquier conector
          </h2>
          <p className="mt-3 text-slate-600">
            El Inspector es la herramienta oficial del protocolo MCP. No requiere instalación
            permanente. Arranca en{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
              localhost:6274
            </code>{' '}
            y conecta a cualquier servidor MCP local o remoto.
          </p>

          {/* Launch command */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <Terminal className="ml-2 h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Lanzar Inspector</span>
            </div>
            <pre className="overflow-x-auto bg-slate-900 p-5 text-sm text-slate-200">
              <code>{CMD_LAUNCH}</code>
            </pre>
          </div>

          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Importante:</strong> la consola imprime la URL completa con el token de proxy,
            por ejemplo{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=…
            </code>
            . Úsala siempre, no la URL raíz sin token.
          </div>

          {/* Port conflict */}
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-[#2361d8] hover:underline select-none">
              El puerto 6277 está ocupado → cómo liberarlo
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Windows PowerShell', code: CMD_PORT_WIN },
                { label: 'macOS / Linux', code: CMD_PORT_UNIX },
              ].map((b) => (
                <div key={b.label} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-800 px-4 py-2">
                    <span className="text-xs font-medium text-slate-400">{b.label}</span>
                  </div>
                  <pre className="overflow-x-auto bg-slate-900 p-4 text-xs leading-6 text-slate-300">
                    <code>{b.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* ── Conectores ────────────────────────────────────────────────────── */}
      <section id="conectores" className="border-t border-slate-100 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <MessageSquare className="h-4 w-4" />
            Conectores disponibles
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
            Tres servidores MCP, un Inspector
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {CONNECTORS.map((c) => (
              <div
                key={c.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{c.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold text-[#011c67]">{c.label}</div>
                    <div className="text-xs text-slate-500">{c.subtitle}</div>
                  </div>
                </div>

                <dl className="space-y-2.5 text-xs text-slate-600">
                  <div>
                    <dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Transport
                    </dt>
                    <dd className="font-mono text-slate-700">{c.transport}</dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      URL
                    </dt>
                    <dd className="break-all font-mono text-[#2361d8]">{c.url}</dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Autenticación
                    </dt>
                    <dd>{c.auth}</dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Tools
                    </dt>
                    <dd>
                      <strong>{c.toolCount}</strong> — {c.toolDetail}
                    </dd>
                  </div>
                </dl>

                {/* Steps */}
                <ol className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {c.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0 font-bold text-[#2361d8]">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Code block */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium text-[#2361d8] hover:underline select-none">
                    Ver configuración completa
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs leading-6 text-slate-300">
                    <code>{c.code}</code>
                  </pre>
                </details>

                {/* Checks */}
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    Qué debes ver
                  </div>
                  <ul className="space-y-1 text-xs text-emerald-800">
                    {c.checks.map((check) => (
                      <li key={check} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={c.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#2361d8] hover:underline"
                >
                  Documentación completa <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Isaak MCP Tools ───────────────────────────────────────────────── */}
      <section id="tools" className="border-t border-slate-100 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <BookOpen className="h-4 w-4" />
            Referencia de tools — Isaak MCP
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
            9 tools del servidor Isaak
          </h2>
          <p className="mt-3 text-slate-600">
            Accesibles desde cualquier agente compatible con MCP. Las tools marcadas{' '}
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-800">
              W
            </span>{' '}
            modifican datos y requieren confirmación explícita.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tool
                  </th>
                  <th className="w-8 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    R/W
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ISAAK_TOOLS.map((tool) => (
                  <tr key={tool.name} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-[#2361d8]">{tool.name}</code>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span
                        className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-bold ${
                          tool.rw === 'W'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tool.rw}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{tool.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Para la referencia completa de las 24 tools del conector Holded → Claude, consulta{' '}
            <a
              href="https://holded.verifactu.business/conectores/claude/docs"
              className="font-medium text-[#2361d8] hover:underline"
            >
              holded.verifactu.business/conectores/claude/docs
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── API keys ──────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Key className="h-4 w-4" />
            API Keys
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[#011c67] sm:text-3xl">
            Genera tu API key en segundos
          </h2>
          <p className="mt-3 text-slate-600">
            Ve a{' '}
            <Link href="/chat" className="font-medium text-[#2361d8] hover:underline">
              Isaak
            </Link>{' '}
            → Configuración → API keys. Las keys{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
              isk_live_
            </code>{' '}
            acceden a datos reales.{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
              isk_test_
            </code>{' '}
            son para sandbox.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 max-w-2xl">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1f55c0]"
            >
              Ir a Isaak — generar key
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://verifactu.business/developers"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <BookOpen className="h-4 w-4" />
              Docs API completa
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
