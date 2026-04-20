import type { Metadata } from 'next';
import HoldedFusionSuccess from './HoldedFusionSuccess';

export const metadata: Metadata = {
  title: 'Holded conectado | Holded',
  description: 'Tu cuenta de Holded esta conectada. Personaliza tu asistente en unos segundos.',
};

export default async function HoldedOnboardingSuccessPage() {
  return <HoldedFusionSuccess />;
}
