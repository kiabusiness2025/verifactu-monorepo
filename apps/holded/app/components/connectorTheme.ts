/**
 * Theme configuration compartido para las paginas publicas de los conectores
 * (ChatGPT, Claude). F4.1 de la arquitectura unificada de conectores Holded.
 *
 * El plan dice: "Estructura identica, solo cambian provider/colores". Este
 * modulo es la "fuente de verdad" de esos colores + textos por proveedor;
 * lo consumen `ConnectorPageShell`, `ConnectorPageHero` y los componentes de
 * banner mobile.
 */

import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileText, Scale, ShieldCheck } from 'lucide-react';

export type ConnectorProvider = 'chatgpt' | 'claude';

export type ConnectorPageKind = 'terms' | 'privacy' | 'dpa' | 'docs' | 'demo';

/**
 * Tailwind classNames pre-resueltos por proveedor. Se usan classes en lugar
 * de tokens runtime para que Tailwind las pille en el build (no podemos
 * componer "bg-{color}-50" porque purga).
 */
export interface ConnectorTheme {
  provider: ConnectorProvider;
  /** Etiqueta humana corta del proveedor (para titulos y CTAs). */
  providerLabel: string;
  /** Etiqueta corporativa larga (p.ej. "Anthropic"). */
  providerCompany: string;
  /** Path al logo del proveedor (servido desde apps/holded/public). */
  providerLogoSrc: string;
  /** Etiqueta del logo (alt). */
  providerLogoAlt: string;
  /** Path base del conector (`/conectores/chatgpt` o `/conectores/claude`). */
  basePath: string;
  /** Background del `<main>` (gradiente hero). */
  mainBackground: string;
  /** Border del nav sticky. */
  navBorder: string;
  /** Color base de los CTAs primarios + texto link. */
  accentText: string;
  accentTextHover: string;
  /** Variante para badges. */
  badgeBorder: string;
  badgeBackground: string;
  badgeText: string;
  /** Subtitulo del hero (color del provider). */
  heroSubtitleText: string;
  /** Card / lista de detalles. */
  cardSoftBorder: string;
  cardSoftBackground: string;
  cardSoftLabel: string;
  /** Color de los iconos lucide acentuados dentro de cards. */
  iconAccent: string;
}

const BASE_LEGAL_KINDS = [
  { kind: 'docs', label: 'Documentacion', Icon: BookOpen },
  { kind: 'privacy', label: 'Privacidad', Icon: ShieldCheck },
  { kind: 'dpa', label: 'DPA', Icon: FileText },
  { kind: 'terms', label: 'Terminos', Icon: Scale },
] as const;

const themes: Record<ConnectorProvider, ConnectorTheme> = {
  chatgpt: {
    provider: 'chatgpt',
    providerLabel: 'ChatGPT',
    providerCompany: 'OpenAI',
    providerLogoSrc: '/brand/chatgpt-logo.png',
    providerLogoAlt: 'ChatGPT',
    basePath: '/conectores/chatgpt',
    mainBackground: 'bg-[linear-gradient(175deg,#ffffff_0%,#f0fdf4_100%)]',
    navBorder: 'border-emerald-100',
    accentText: 'text-emerald-700',
    accentTextHover: 'hover:text-emerald-900',
    badgeBorder: 'border-emerald-200',
    badgeBackground: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    heroSubtitleText: 'text-emerald-700',
    cardSoftBorder: 'border-emerald-100',
    cardSoftBackground: 'bg-emerald-50',
    cardSoftLabel: 'text-emerald-600',
    iconAccent: 'text-emerald-600',
  },
  claude: {
    provider: 'claude',
    providerLabel: 'Claude',
    providerCompany: 'Anthropic',
    providerLogoSrc: '/brand/claude-logo.svg',
    providerLogoAlt: 'Claude',
    basePath: '/conectores/claude',
    mainBackground: 'bg-[linear-gradient(175deg,#ffffff_0%,#fff7ed_100%)]',
    navBorder: 'border-amber-100',
    accentText: 'text-amber-700',
    accentTextHover: 'hover:text-amber-900',
    badgeBorder: 'border-amber-200',
    badgeBackground: 'bg-amber-50',
    badgeText: 'text-amber-800',
    heroSubtitleText: 'text-amber-700',
    cardSoftBorder: 'border-amber-100',
    cardSoftBackground: 'bg-amber-50',
    cardSoftLabel: 'text-amber-600',
    iconAccent: 'text-amber-600',
  },
};

export function getConnectorTheme(provider: ConnectorProvider): ConnectorTheme {
  return themes[provider];
}

export interface ConnectorLegalLink {
  kind: ConnectorPageKind;
  label: string;
  href: string;
  Icon: LucideIcon;
}

/**
 * Construye los 4 links que aparecen en el nav sticky y en el footer de cada
 * pagina legal del conector. Se mantiene el mismo orden y los mismos labels
 * en ambos proveedores para reforzar la paridad visual.
 */
export function buildConnectorLegalLinks(provider: ConnectorProvider): ConnectorLegalLink[] {
  const theme = getConnectorTheme(provider);
  return BASE_LEGAL_KINDS.map(({ kind, label, Icon }) => ({
    kind,
    label,
    href: `${theme.basePath}/${kind}`,
    Icon,
  }));
}
