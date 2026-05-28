// Landing pública isaak.verifactu.business.
//
// V1 LAUNCH (2026-05-28): bajo NEXT_PUBLIC_ISAAK_V1_LAUNCH=true se renderiza
// IsaakHomeLandingV1 (minimal: hero + 3 beneficios + cómo funciona +
// pricing 2 planes + FAQ + CTA). Sin el flag, se mantiene la landing
// completa IsaakHomeLanding sin tocar nada.
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

import type { Metadata } from 'next';
import IsaakHomeLanding, { landingMetadata } from './components/IsaakHomeLanding';
import IsaakHomeLandingV1, { isaakLandingV1Metadata } from './components/IsaakHomeLandingV1';
import { isV1Launch } from './lib/feature-flags';

export const metadata: Metadata = isV1Launch() ? isaakLandingV1Metadata : landingMetadata;

export default function IsaakHomePage() {
  return isV1Launch() ? <IsaakHomeLandingV1 /> : <IsaakHomeLanding />;
}
