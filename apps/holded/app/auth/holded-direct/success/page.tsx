/**
 * /auth/holded-direct/success
 *
 * Página de éxito que se muestra cuando un usuario completa el flow
 * /auth/holded-direct DIRECTAMENTE (no desde Claude/ChatGPT).
 *
 * Usuarios que vienen via Claude/ChatGPT NUNCA ven esta página: tras
 * conectar la API key vuelven a su `next=` original (el consent screen
 * del OAuth) y completan el flow OAuth. Solo aterrizan aquí los que
 * entraron al landing directamente o testers/soporte.
 *
 * Reemplaza el redirect a `/dashboard` (que causaba loop infinito porque
 * `/dashboard` es un redirector que necesita un `next=` poblado).
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { SuccessActions } from './SuccessActions';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

// URL canónica del MCP de Claude (sirve apps/holded-mcp en Render).
// El endpoint JSON-RPC es POST /mcp; el well-known live en
// /.well-known/oauth-authorization-server y /.well-known/oauth-protected-resource.
const CLAUDE_MCP_URL =
  process.env.NEXT_PUBLIC_CLAUDE_MCP_URL?.replace(/\/$/, '') ||
  'https://claude.verifactu.business/mcp';

// URL canónica del MCP de ChatGPT (proxy /api/mcp/holded en apps/holded → apps/app).
const CHATGPT_MCP_URL = `${HOLDED_SITE_URL}/api/mcp/holded`;

const CLAUDE_SETTINGS_URL = 'https://claude.ai/settings/connectors';
const CHATGPT_SETTINGS_URL = 'https://chatgpt.com/#settings/Connectors';

export const metadata: Metadata = {
  title: 'Conector activado | Holded · Verifactu',
  description:
    'Tu conector Holded se ha activado correctamente. Añádelo a Claude o ChatGPT para empezar.',
  robots: { index: false, follow: false },
};

export default function HoldedDirectSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="text-lg font-semibold text-slate-900">Holded · Verifactu</span>
        </div>

        {/* Hero — éxito */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white ring-4 ring-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Conector activado</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tu API key de Holded se ha guardado de forma cifrada. Ahora añade el conector en Claude
            o ChatGPT y empieza a pedirles que gestionen tu Holded por ti.
          </p>
        </div>

        {/* Tarjetas Claude + ChatGPT */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Claude */}
          <SuccessActions
            platform="claude"
            mcpUrl={CLAUDE_MCP_URL}
            settingsUrl={CLAUDE_SETTINGS_URL}
            title="Añadir a Claude"
            subtitle="Claude desktop, web o móvil"
            steps={[
              'Abre Claude → Settings → Connectors',
              'Pulsa “Add custom connector”',
              'Pega la URL de abajo y acepta los permisos',
            ]}
          />

          {/* ChatGPT */}
          <SuccessActions
            platform="chatgpt"
            mcpUrl={CHATGPT_MCP_URL}
            settingsUrl={CHATGPT_SETTINGS_URL}
            title="Añadir a ChatGPT"
            subtitle="ChatGPT web (Plus, Team, Enterprise)"
            steps={[
              'Abre ChatGPT → Settings → Connectors',
              'Pulsa “Add” y elige “Holded”',
              'Inicia sesión con el mismo email que aquí',
            ]}
          />
        </div>

        {/* Soporte */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center text-sm text-slate-600">
          ¿Necesitas ayuda?{' '}
          <a
            href={`${HOLDED_SITE_URL}/conectores/claude/soporte`}
            className="font-semibold text-[#ff5460] underline-offset-2 hover:underline"
          >
            Contactar soporte
          </a>{' '}
          o consultar la{' '}
          <a
            href={`${HOLDED_SITE_URL}/conectores/claude/docs`}
            className="font-semibold text-slate-800 underline-offset-2 hover:underline"
          >
            documentación
          </a>
          .
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Tu API key se ha cifrado con AES-256 y se almacena solo en tu tenant.
        </p>
      </div>
    </main>
  );
}

// Stub para forzar Suspense en server component que importa client component
export const dynamic = 'force-static';
