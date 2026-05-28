// Landing pública verifactu.business.
//
// V1 LAUNCH (2026-05-28): bajo NEXT_PUBLIC_ISAAK_V1_LAUNCH=true se renderiza
// el Hub V1 minimal (3 productos). Sin el flag, se mantiene el Hub Phase1
// completo (sectoriales, asesorías, etc.) sin tocar nada.
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

'use client';

import LandingPublicHubPhase1 from './components/LandingPublicHubPhase1';
import LandingPublicHubV1 from './components/LandingPublicHubV1';
import { ISAAK_V1_LAUNCH } from './lib/feature-flags';

export default function Page() {
  return ISAAK_V1_LAUNCH ? <LandingPublicHubV1 /> : <LandingPublicHubPhase1 />;
}
