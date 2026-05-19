/**
 * B4 hardening (auditoría 2026-05-11): consent screen explícito para el flujo
 * OAuth público del conector Holded × ChatGPT.
 *
 * El revisor de OpenAI (y los compliance reviewers de cualquier OAuth 2.1
 * server) espera ver una pantalla donde:
 *   - Se identifica el client (ChatGPT en este caso).
 *   - Se listan los scopes solicitados en lenguaje humano comprensible.
 *   - Se muestran los links a T&C, Privacy, DPA.
 *   - El usuario pulsa explícitamente Authorize o Cancel.
 *
 * Esta página se ALCANZA desde /oauth/authorize cuando consent_confirmed != 1.
 * Tras pulsar Authorize, redirige a /oauth/authorize añadiendo
 * consent_confirmed=1 (manteniendo el resto de params), que ahora sí mintará
 * el authorization code.
 *
 * Cancel redirige al redirect_uri del cliente con error=access_denied.
 */

import { redirect } from 'next/navigation';

import {
  HOLDED_MCP_TOOL_SCOPES,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';
import { getPublicScopePreset } from '@/lib/oauth/mcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SearchParams = Record<string, string | string[] | undefined>;

const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  'mcp.read': {
    label: 'Conexión con el conector MCP',
    description: 'Permite que ChatGPT establezca la sesión y llame a las tools del conector.',
  },
  'holded.invoices.read': {
    label: 'Leer tus facturas',
    description:
      'Listar facturas emitidas, obtener una factura concreta por número o ID, ver totales e importes.',
  },
  'holded.invoices.write': {
    label: 'Crear borradores de factura',
    description:
      'Crear borradores (DRAFT) de factura — nunca emitir, enviar o cobrar — con tu confirmación explícita en cada uso.',
  },
  'holded.documents.read': {
    label: 'Leer tus documentos comerciales',
    description:
      'Listar y consultar facturas de compra, presupuestos, albaranes, abonos y otros documentos. Incluye descargar el PDF para revisión. Solo lectura, sin enviar ni modificar.',
  },
  'holded.contacts.read': {
    label: 'Leer tus contactos',
    description:
      'Listar clientes y proveedores, consultar email, CIF/NIF, teléfono y pendientes de cobro.',
  },
  'holded.accounts.read': {
    label: 'Leer tu contabilidad',
    description:
      'Consultar el plan contable y el libro diario en modo lectura (sin asientos ni modificaciones).',
  },
  'holded.crm.read': {
    label: 'Leer datos de CRM',
    description: 'Listar funnels, leads y bookings en modo lectura.',
  },
  'holded.projects.read': {
    label: 'Leer tus proyectos',
    description: 'Listar proyectos, tareas y registros de tiempo en modo lectura.',
  },
};

function getString(params: SearchParams, key: string): string {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

function buildAuthorizeReturnUrl(params: SearchParams, baseOrigin: string) {
  const url = new URL('/oauth/authorize', baseOrigin);
  url.searchParams.set('response_type', 'code');
  for (const key of [
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
    'resource',
  ]) {
    const value = getString(params, key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set('consent_confirmed', '1');
  url.searchParams.set('holded_login_confirmed', '1');
  return url.toString();
}

function buildCancelUrl(redirectUri: string, state: string) {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'access_denied');
    if (state) url.searchParams.set('state', state);
    return url.toString();
  } catch {
    return '/conectores/chatgpt';
  }
}

function resolveBaseOrigin(): string {
  // El botón "Autorizar" devuelve al usuario a /oauth/authorize?consent_confirmed=1
  // que debe servirse bajo el dominio canónico público (holded.verifactu.business),
  // proxyeado a apps/app — así no hay cambio visible de dominio durante la auth flow.
  const raw =
    process.env.HOLDED_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() ||
    process.env.MCP_PUBLIC_CONNECTOR_URL?.trim() ||
    'https://holded.verifactu.business';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://holded.verifactu.business';
  }
}

function resolveLegalOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() ||
    process.env.HOLDED_PUBLIC_URL?.trim() ||
    'https://holded.verifactu.business';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://holded.verifactu.business';
  }
}

function resolveClientName(clientId: string): { name: string; vendor: string } {
  // ChatGPT registra clientes con IDs como `chatgpt-...` o callbacks en chatgpt.com.
  // Por seguridad mostramos siempre "ChatGPT" + el client_id literal para
  // que el usuario pueda verificarlo.
  if (/chatgpt|openai/i.test(clientId)) {
    return { name: 'ChatGPT', vendor: 'OpenAI · openai.com' };
  }
  if (/claude|anthropic/i.test(clientId)) {
    return { name: 'Claude', vendor: 'Anthropic · anthropic.com' };
  }
  return { name: 'Aplicación externa', vendor: 'Cliente OAuth' };
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const clientId = getString(params, 'client_id');
  const redirectUri = getString(params, 'redirect_uri');
  const state = getString(params, 'state');
  const email = getString(params, 'email');
  const requestedScope = getString(params, 'scope');

  // Si faltan params clave, no podemos renderizar la pantalla — redirigimos al
  // landing del conector con un error visible.
  if (!clientId || !redirectUri) {
    redirect('/conectores/chatgpt?consent_error=missing_params');
  }

  // Defense in depth: la lista que mostramos es siempre la intersección de los
  // scopes solicitados con el preset público activo (`openai_review_invoicing_v1`
  // desde 2026-05-18 tarde, 6 scopes para 10 tools). Aunque /oauth/authorize ya
  // hace el clamp, lo replicamos aquí para que NUNCA se muestre al usuario un
  // permiso que el servidor no vaya a conceder realmente.
  const publicPresetScopes = getHoldedMcpScopePreset(getPublicScopePreset());
  const requestedScopeList = requestedScope
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const grantedScopes = (
    requestedScopeList.length > 0 ? requestedScopeList : publicPresetScopes
  ).filter((s) => (publicPresetScopes as readonly string[]).includes(s));

  const visibleToolsCount = Object.entries(HOLDED_MCP_TOOL_SCOPES).filter((entry) => {
    const required = entry[1] as string[];
    return required.every((s) => grantedScopes.includes(s));
  }).length;

  const baseOrigin = resolveBaseOrigin();
  const legalOrigin = resolveLegalOrigin();
  const authorizeUrl = buildAuthorizeReturnUrl(params, baseOrigin);
  const cancelUrl = buildCancelUrl(redirectUri, state);
  const client = resolveClientName(clientId);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 sm:py-16">
        {/* Brand row */}
        <div className="mb-8 flex items-center gap-3">
          {/* Cliente */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <span className="text-xs font-bold text-emerald-700">{client.name.slice(0, 2)}</span>
          </div>
          <span className="text-2xl text-slate-400">+</span>
          {/* Holded */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 shadow-sm">
            <span className="text-xs font-bold text-rose-700">H</span>
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {client.name} quiere conectarse a tu cuenta de Holded
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Revisa lo que está pidiendo el conector antes de continuar.
        </p>

        {/* Account context */}
        <section className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Conectando como
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-900">{email || 'Tu cuenta'}</p>
          <p className="mt-1 text-xs text-slate-500">
            Cliente OAuth: <span className="font-mono">{clientId}</span>
            <br />
            Solicitado por: {client.vendor}
          </p>
        </section>

        {/* Scopes list */}
        <section className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Permisos solicitados ({grantedScopes.length} scopes · {visibleToolsCount} tools)
          </h2>
          <ul className="mt-3 space-y-3">
            {grantedScopes.map((scope) => {
              const meta = SCOPE_DESCRIPTIONS[scope];
              if (!meta) {
                return (
                  <li key={scope} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{scope}</p>
                  </li>
                );
              }
              return (
                <li key={scope} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600">{meta.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            <strong>Importante.</strong> Cualquier acción de escritura (por ejemplo crear un
            borrador de factura) requiere tu confirmación explícita en la conversación. El conector
            nunca emite ni envía facturas, ni mueve dinero, ni borra contactos sin que tú lo pidas.
          </p>
        </section>

        {/* Legal */}
        <section className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Documentos legales
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Al pulsar <strong>Autorizar</strong> confirmas que has leído y aceptas:
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${legalOrigin}/conectores/chatgpt/terms`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Términos
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${legalOrigin}/conectores/chatgpt/privacy`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de privacidad
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${legalOrigin}/conectores/chatgpt/dpa`}
                target="_blank"
                rel="noopener noreferrer"
              >
                DPA
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${legalOrigin}/conectores/chatgpt/soporte`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Soporte
              </a>
            </li>
          </ul>
        </section>

        {/* Actions */}
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row-reverse">
          <a
            href={authorizeUrl}
            className="flex-1 rounded-full bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Autorizar a {client.name}
          </a>
          <a
            href={cancelUrl}
            className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </a>
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
          Puedes revocar el acceso en cualquier momento desde tu panel de cuenta en{' '}
          <a
            className="underline"
            href={`${legalOrigin}/admin`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Verifactu Admin
          </a>
          . La conexión se cifra en tránsito (TLS 1.2+) y en reposo. Más detalles en el DPA.
        </p>
      </div>
    </main>
  );
}
