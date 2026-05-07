/**
 * Shell visual compartido para las paginas publicas de los conectores
 * (ChatGPT y Claude). F4.1 de la arquitectura unificada de conectores Holded.
 *
 * Contiene la chrome comun (nav sticky + footer legal) que aparece igual en
 * `/conectores/chatgpt/{terms,privacy,dpa,docs,demo}` y en sus equivalentes
 * de Claude. El contenido de cuerpo se inyecta como children — los detalles
 * legales / docs especificos por proveedor siguen viviendo en cada page.tsx.
 *
 * Decision clave (Sesion 4): "Shell compartido + contenido por pagina". El
 * cuerpo se queda diverso por proveedor cuando hace falta (privacy de Claude
 * lista sub-procesadores Anthropic; ChatGPT lista OpenAI), pero la chrome
 * unifica.
 */

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  buildConnectorLegalLinks,
  getConnectorTheme,
  type ConnectorPageKind,
  type ConnectorProvider,
} from './connectorTheme';

export interface ConnectorPageShellProps {
  provider: ConnectorProvider;
  /**
   * Que pagina del paquete legal estamos pintando. Permite resaltar el link
   * activo en el nav y omitir el "back to landing" cuando ya estamos en la
   * landing.
   */
  kind: ConnectorPageKind;
  /** Contenido principal (hero + secciones). */
  children: ReactNode;
  /** Override del titulo del back-link. Default "Volver al conector {provider}". */
  backLabel?: string;
}

export function ConnectorPageShell({
  provider,
  kind,
  children,
  backLabel,
}: ConnectorPageShellProps) {
  const theme = getConnectorTheme(provider);
  const legalLinks = buildConnectorLegalLinks(provider);
  const backHref = theme.basePath;
  const backText = backLabel ?? `Volver al conector ${theme.providerLabel}`;

  return (
    <main className={`min-h-screen ${theme.mainBackground} text-slate-900`}>
      <nav className={`sticky top-0 z-10 border-b ${theme.navBorder} bg-white/90 backdrop-blur-sm`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href={backHref}
            className={`inline-flex items-center gap-2 text-sm font-medium ${theme.accentText} transition ${theme.accentTextHover}`}
          >
            <ArrowLeft className="h-4 w-4" />
            {backText}
          </Link>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => {
              const isActive = link.kind === kind;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`hidden text-xs font-medium transition sm:inline ${
                    isActive
                      ? `${theme.accentText} font-semibold`
                      : `text-slate-500 ${theme.accentTextHover}`
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-12">
        {children}

        <footer className="mt-12 border-t border-slate-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={backHref}
              className={`inline-flex items-center gap-2 text-sm font-semibold ${theme.accentText} transition ${theme.accentTextHover}`}
            >
              <ArrowLeft className="h-4 w-4" />
              {`Conector ${theme.providerLabel}`}
            </Link>
            <div className="flex flex-wrap gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium text-slate-500 transition ${theme.accentTextHover}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="w-full text-center text-xs text-slate-400 sm:w-auto sm:text-right">
              Expert Estudios Profesionales, SLU · Verifactu Business · Holded Solution Partner
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}

/**
 * Hero estandar de pagina legal: doble logo (Holded + provider), badge de
 * categoria, titulo + subtitulo, intro y fecha de actualizacion. Se usa en
 * terms / privacy / dpa para reforzar la paridad visual.
 */
export interface ConnectorPageHeroProps {
  provider: ConnectorProvider;
  /** Etiqueta del badge encima del titulo (p.ej. "Terminos de Servicio"). */
  badgeLabel: string;
  badgeIcon?: ReactNode;
  /** Titulo principal (h1). */
  title: string;
  /** Subtitulo: aparece debajo del h1 con el color del provider. */
  subtitle?: string;
  /** Parrafo introductorio. */
  intro?: ReactNode;
  /** Texto secundario (p.ej. "Ultima actualizacion: 29 de abril de 2026"). */
  lastUpdated?: string;
  /**
   * Card opcional al lado derecho del hero (aviso, snippet de info, etc.).
   * Si se pasa, se renderiza con bordes y sombra acordes al tema.
   */
  asideCard?: ReactNode;
}

export function ConnectorPageHero({
  provider,
  badgeLabel,
  badgeIcon,
  title,
  subtitle,
  intro,
  lastUpdated,
  asideCard,
}: ConnectorPageHeroProps) {
  const theme = getConnectorTheme(provider);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <span className="text-slate-300">+</span>
          <Image
            src={theme.providerLogoSrc}
            alt={theme.providerLogoAlt}
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border ${theme.badgeBorder} ${theme.badgeBackground} px-3 py-1 text-xs font-semibold ${theme.badgeText}`}
        >
          {badgeIcon}
          {badgeLabel}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          {title}
          {subtitle ? (
            <span className={`block text-2xl font-semibold ${theme.heroSubtitleText}`}>
              {subtitle}
            </span>
          ) : null}
        </h1>
        {intro ? <p className="max-w-2xl text-base leading-7 text-slate-600">{intro}</p> : null}
        {lastUpdated ? <p className="text-sm text-slate-400">{lastUpdated}</p> : null}
      </div>

      {asideCard ? (
        <div
          className={`shrink-0 rounded-3xl border ${theme.cardSoftBorder} bg-white p-6 shadow-sm lg:w-[22rem]`}
        >
          {asideCard}
        </div>
      ) : null}
    </div>
  );
}
