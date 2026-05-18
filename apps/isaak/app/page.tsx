import type { Metadata } from 'next';
import IsaakHomeLanding, { landingMetadata } from './components/IsaakHomeLanding';

export const metadata: Metadata = landingMetadata;

export default function IsaakHomePage() {
  return <IsaakHomeLanding />;
}
