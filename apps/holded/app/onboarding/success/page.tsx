import type { Metadata } from 'next';
import HoldedFusionSuccess from './HoldedFusionSuccess';

export const metadata: Metadata = {
  title: 'Conexion lista | Verifactu',
  description:
    'Conexion validada correctamente. Continuamos con la preparacion final del conector.',
};

export default async function HoldedOnboardingSuccessPage() {
  return <HoldedFusionSuccess />;
}
