/**
 * ConnectorRequirementsCard — bloque visible en las landings ChatGPT y Claude
 * que cubre tres gaps reportados en la auditoría de 2026-05-19:
 *
 *   1. Cláusulas de limitaciones AJENAS al conector (depende de licencias
 *      contratadas con OpenAI/Anthropic). El texto legal completo está en
 *      `/conectores/{chatgpt|claude}/terms`, pero el usuario debe verlo en la
 *      landing antes de intentar conectar.
 *
 *   2. Aviso explícito sobre el flow Claude.ai: para que el OAuth bridge
 *      funcione el usuario tiene que estar autenticado en claude.ai ANTES de
 *      pulsar "Añadir a Claude". Si no, la primera redirección le devuelve a
 *      claude.ai/login y pierde el contexto. Verificado live por soporte.
 *
 *   3. Enlaces externos a Holded, ChatGPT y Claude para que usuarios que no
 *      conocen ninguna de las tres plataformas puedan informarse antes de
 *      decidir si esta integración les sirve.
 *
 * Renderizado en `ConnectorLandingClient`, justo después de "Trust points" y
 * antes del bloque FAQ.
 */

import { ExternalLink, ShieldAlert, KeyRound, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';

type ConnectorId = 'chatgpt' | 'claude';

type CopyBlock = {
  /** Title of the connector-specific subscription requirement. */
  subscriptionTitle: string;
  /** Body text describing what plan(s) are required. */
  subscriptionBody: string;
  /** Link to the official subscription page (where to upgrade if missing). */
  subscriptionHref: string;
  subscriptionHrefLabel: string;
  /** Login-prerequisite note. Only Claude has a strict pre-login requirement. */
  loginRequirementTitle?: string;
  loginRequirementBody?: string;
  /** External link to the AI vendor for users unfamiliar with the platform. */
  aiVendorHref: string;
  aiVendorLabel: string;
  aiVendorBlurb: string;
  /** Theme accent classes (Tailwind). */
  accentBorder: string;
  accentText: string;
  accentBg: string;
};

const COPY: Record<ConnectorId, CopyBlock> = {
  chatgpt: {
    subscriptionTitle: 'Necesitas una suscripción ChatGPT con conectores activos',
    subscriptionBody:
      'Los conectores de ChatGPT (incluido este) están disponibles en ChatGPT Plus, Pro, Business, Enterprise y Edu. No están disponibles en el plan gratuito de ChatGPT. Si tu plan no incluye conectores, debes actualizar tu suscripción con OpenAI antes — Verifactu no puede activarlos por ti.',
    subscriptionHref: 'https://openai.com/chatgpt/pricing/',
    subscriptionHrefLabel: 'Ver planes ChatGPT',
    aiVendorHref: 'https://chatgpt.com',
    aiVendorLabel: 'Conoce ChatGPT',
    aiVendorBlurb:
      'ChatGPT es el asistente conversacional de OpenAI. Los "conectores" permiten que ChatGPT consulte tus herramientas (como Holded) sin copy-paste manual.',
    accentBorder: 'border-[#10a37f]/25',
    accentText: 'text-[#10a37f]',
    accentBg: 'bg-[#10a37f]/5',
  },
  claude: {
    subscriptionTitle: 'Necesitas una suscripción Claude con conectores activos',
    subscriptionBody:
      'Los conectores externos de Claude (incluido este) están disponibles en Claude Pro, Team y Enterprise. No están disponibles en el plan gratuito de claude.ai. Si tu plan no incluye conectores, debes actualizar tu suscripción con Anthropic antes — Verifactu no puede activarlos por ti.',
    subscriptionHref: 'https://www.anthropic.com/pricing',
    subscriptionHrefLabel: 'Ver planes Claude',
    loginRequirementTitle: 'Inicia sesión en claude.ai ANTES de pulsar "Añadir a Claude"',
    loginRequirementBody:
      'El botón "Añadir a Claude" usa el bridge OAuth oficial de Anthropic. Si tu navegador no tiene sesión activa en claude.ai en ese momento, te redirige a la pantalla de login y se pierde el contexto. Abre claude.ai en otra pestaña, confirma que estás dentro de tu cuenta, y vuelve aquí — el flow funciona en unos segundos.',
    aiVendorHref: 'https://claude.ai',
    aiVendorLabel: 'Conoce Claude',
    aiVendorBlurb:
      'Claude es el asistente conversacional de Anthropic. Los "conectores remotos" permiten que Claude consulte tus herramientas (como Holded) sin copy-paste manual.',
    accentBorder: 'border-[#d97757]/25',
    accentText: 'text-[#d97757]',
    accentBg: 'bg-[#d97757]/5',
  },
};

export function ConnectorRequirementsCard({ connector }: { connector: ConnectorId }) {
  const copy = COPY[connector];

  return (
    <section className="border-y border-slate-100 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Antes de conectar
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Requisitos y limitaciones.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Este conector depende de servicios de terceros (Holded, OpenAI/Anthropic) cuyas
            licencias contratas directamente con ellos. Verifactu Business desarrolla y mantiene la
            integración, pero no puede activar funciones que dependen de tu suscripción con esos
            terceros.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Subscription / licensing clause */}
          <div className={`rounded-3xl border ${copy.accentBorder} ${copy.accentBg} p-6 shadow-sm`}>
            <div className="flex items-start gap-3">
              <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${copy.accentText}`} />
              <div>
                <h3 className="text-base font-bold text-slate-950">{copy.subscriptionTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{copy.subscriptionBody}</p>
                <a
                  href={copy.subscriptionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${copy.accentText} hover:underline`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {copy.subscriptionHrefLabel}
                </a>
              </div>
            </div>
          </div>

          {/* Holded license clause (mismo para ambos) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5460]" />
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  Y una cuenta Holded con permisos de API
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Necesitas una cuenta activa de Holded y permiso de administrador para generar una
                  API key (Configuración → Desarrolladores → API). Las cuentas de prueba de Holded
                  funcionan; las cuentas suspendidas o sin acceso a API no.
                </p>
                <a
                  href="https://www.holded.com/es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff5460] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver planes Holded
                </a>
              </div>
            </div>
          </div>

          {/* Claude-only: login prerequisite */}
          {copy.loginRequirementTitle ? (
            <div
              className={`md:col-span-2 rounded-3xl border ${copy.accentBorder} ${copy.accentBg} p-6 shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <Sparkles className={`mt-0.5 h-5 w-5 shrink-0 ${copy.accentText}`} />
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {copy.loginRequirementTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {copy.loginRequirementBody}
                  </p>
                  <a
                    href="https://claude.ai/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${copy.accentText} hover:underline`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir claude.ai en otra pestaña
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Vendor info cards — para usuarios que no conocen las plataformas */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              ¿No conoces estas plataformas?
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="https://www.holded.com/es"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
            >
              <div className="text-sm font-semibold text-slate-900 group-hover:text-[#ff5460]">
                Holded
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Software de gestión empresarial todo-en-uno (facturación, contabilidad, CRM,
                proyectos) usado por más de 100.000 PYMEs en España y Europa.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-[#ff5460]">
                holded.com
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
            <a
              href={copy.aiVendorHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
            >
              <div
                className={`text-sm font-semibold text-slate-900 group-hover:${copy.accentText}`}
              >
                {copy.aiVendorLabel.replace('Conoce ', '')}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{copy.aiVendorBlurb}</p>
              <span
                className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:${copy.accentText}`}
              >
                {copy.aiVendorHref.replace('https://', '')}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
            <Link
              href="/conectores"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
            >
              <div className="text-sm font-semibold text-slate-900 group-hover:text-[#ff5460]">
                ¿No sabes cuál usar?
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Si ya tienes ChatGPT o Claude en tu trabajo, usa el conector correspondiente. Si no
                usas ninguno, prueba primero la plataforma gratuita y vuelve aquí cuando hayas
                upgrade a un plan con conectores.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-[#ff5460]">
                Hub de conectores
                <ExternalLink className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Verifactu Business es una integración independiente — no somos Holded, OpenAI ni
          Anthropic. Cada plataforma mantiene sus propios términos de servicio, privacidad y
          condiciones comerciales.
        </p>
      </div>
    </section>
  );
}
