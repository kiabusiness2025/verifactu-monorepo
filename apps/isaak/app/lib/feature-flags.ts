/**
 * Feature flags de Isaak.
 *
 * V1 LAUNCH (2026-05-28): Esconde funcionalidad no-Holded para reducir
 * la superficie del producto al mínimo viable. El código queda intacto;
 * solo se oculta del UI.
 *
 * Ver: docs/product/ISAAK_LAUNCH_V1_2026-05-28.md
 *
 * Para activar: setear NEXT_PUBLIC_ISAAK_V1_LAUNCH=true en Vercel.
 * Es NEXT_PUBLIC_ porque los componentes que lo leen (sidebar, bottom nav)
 * son client components.
 */

export const ISAAK_V1_LAUNCH = process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH === 'true';

/** Helper para guardar el flag desde server-side (env del runtime SSR). */
export function isV1Launch(): boolean {
  return process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH === 'true';
}
