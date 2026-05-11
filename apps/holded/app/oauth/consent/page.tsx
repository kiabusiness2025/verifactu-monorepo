/**
 * Consent screen for the Holded × ChatGPT / Claude OAuth connector.
 *
 * Served natively from holded.verifactu.business to avoid cross-app Next.js
 * asset path failures that occur when proxying full HTML from apps/app.
 * The proxied route was loading /_next/static chunks from the wrong build,
 * causing a blank page on mobile and desktop.
 */

import Image from 'next/image';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SearchParams = Record<string, string | string[] | undefined>;

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

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

function buildAuthorizeReturnUrl(params: SearchParams): string {
  const url = new URL('/oauth/authorize', HOLDED_SITE_URL);
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

function buildCancelUrl(redirectUri: string, state: string): string {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'access_denied');
    if (state) url.searchParams.set('state', state);
    return url.toString();
  } catch {
    return '/conectores/chatgpt';
  }
}

function resolveClientName(clientId: string): {
  name: string;
  vendor: string;
  logoSrc: string | null;
  logoBg: string;
  logoBorder: string;
} {
  if (/chatgpt|openai/i.test(clientId))
    return {
      name: 'ChatGPT',
      vendor: 'OpenAI · openai.com',
      logoSrc: '/brand/chatgpt-logo.png',
      logoBg: 'bg-[#10a37f]',
      logoBorder: 'border-[#10a37f]/30',
    };
  if (/claude|anthropic/i.test(clientId))
    return {
      name: 'Claude',
      vendor: 'Anthropic · anthropic.com',
      logoSrc: '/brand/claude-logo.svg',
      logoBg: 'bg-[#d97757]',
      logoBorder: 'border-[#d97757]/30',
    };
  return {
    name: 'Aplicación externa',
    vendor: 'Cliente OAuth',
    logoSrc: null,
    logoBg: 'bg-slate-100',
    logoBorder: 'border-slate-200',
  };
}

export default async function ConsentPage({
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

  if (!clientId || !redirectUri) {
    redirect('/conectores/chatgpt?consent_error=missing_params');
  }

  const requestedScopeList = requestedScope
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const grantedScopes =
    requestedScopeList.length > 0 ? requestedScopeList : Object.keys(SCOPE_DESCRIPTIONS);

  const authorizeUrl = buildAuthorizeReturnUrl(params);
  const cancelUrl = buildCancelUrl(redirectUri, state);
  const client = resolveClientName(clientId);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 sm:py-16">
        {/* Brand row */}
        <div className="mb-8 flex items-center gap-3">
          {/* Client logo */}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${client.logoBorder} ${client.logoBg} shadow-sm`}
          >
            {client.logoSrc ? (
              <Image
                src={client.logoSrc}
                alt={client.name}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            ) : (
              <span className="text-xs font-bold text-slate-600">{client.name.slice(0, 2)}</span>
            )}
          </div>
          <span className="text-2xl text-slate-400">+</span>
          {/* Holded logo */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff5460]/20 bg-[#fff1f2] shadow-sm">
            <Image
              src="/brand/holded/holded-diamond-logo.png"
              alt="Holded"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
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
            Permisos solicitados ({grantedScopes.length} scopes)
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
                href={`${HOLDED_SITE_URL}/conectores/chatgpt/terms`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Términos
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${HOLDED_SITE_URL}/conectores/chatgpt/privacy`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de privacidad
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${HOLDED_SITE_URL}/conectores/chatgpt/dpa`}
                target="_blank"
                rel="noopener noreferrer"
              >
                DPA
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-emerald-700 underline"
                href={`${HOLDED_SITE_URL}/conectores/chatgpt/soporte`}
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
            href={`${HOLDED_SITE_URL}/admin`}
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
