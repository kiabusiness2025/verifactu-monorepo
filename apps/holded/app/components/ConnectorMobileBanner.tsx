/**
 * Banner mobile-first que aparece en las landings del conector
 * (`/conectores/chatgpt` y `/conectores/claude`) recordando al usuario que
 * en mobile puede usar el flujo simplificado `/auth/holded-direct` (F4.3 de
 * la arquitectura unificada).
 *
 * Implementacion: CSS-only (no JS UA detection). Se muestra en mobile via
 * Tailwind responsive classes (`sm:hidden`). Esto evita parpadeo en SSR y
 * sobrevive al iOS in-app browser sin dependencias.
 */

import { Smartphone, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { getConnectorTheme, type ConnectorProvider } from './connectorTheme';

export interface ConnectorMobileBannerProps {
  provider: ConnectorProvider;
}

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

export function ConnectorMobileBanner({ provider }: ConnectorMobileBannerProps) {
  const theme = getConnectorTheme(provider);
  const directLoginUrl = new URL('/auth/holded-direct', HOLDED_SITE_URL);
  directLoginUrl.searchParams.set('source', `conectores_${provider}_mobile_banner`);

  return (
    <div
      role="region"
      aria-label="Acceso rapido para mobile"
      className={`mx-auto mt-6 max-w-2xl rounded-2xl border ${theme.cardSoftBorder} ${theme.cardSoftBackground} px-4 py-3 shadow-sm sm:hidden`}
    >
      <div className="flex items-start gap-3">
        <Smartphone className={`mt-0.5 h-5 w-5 shrink-0 ${theme.iconAccent}`} />
        <div className="flex-1 text-sm leading-6 text-slate-800">
          <strong>Estas en mobile.</strong> Para evitar problemas con el navegador embebido de
          ChatGPT o Claude, usa nuestro flujo simplificado:
        </div>
      </div>
      <Link
        href={directLoginUrl.toString()}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border ${theme.badgeBorder} bg-white px-3 py-2 text-sm font-semibold ${theme.accentText} ${theme.accentTextHover} transition`}
      >
        Conectar Holded en 30 segundos
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
