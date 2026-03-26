import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import HoldedFusionSuccess from './HoldedFusionSuccess';

export const metadata: Metadata = {
  title: 'Conexion lista | Isaak para Holded',
  description: 'Conexion validada correctamente. Ya puedes entrar al dashboard y empezar.',
};

export default async function HoldedOnboardingSuccessPage() {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect('/auth/holded?source=holded_onboarding_success&next=/onboarding');
  }

  return <HoldedFusionSuccess />;
}
