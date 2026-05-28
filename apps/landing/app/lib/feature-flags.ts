// Feature flag para el lanzamiento V1.
//
// Cuando está activo (NEXT_PUBLIC_ISAAK_V1_LAUNCH=true en Vercel) la landing
// pública se reduce al Hub minimal de los 3 productos (Isaak + Conector Claude
// + Conector ChatGPT). El resto del marketing (sectoriales, asesorías, etc.)
// queda en código pero oculto.
//
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

export const ISAAK_V1_LAUNCH = process.env.NEXT_PUBLIC_ISAAK_V1_LAUNCH === 'true';
