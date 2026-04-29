import type { Metadata } from 'next';
import IsaakLandingClient from './components/IsaakLandingClient';

export const metadata: Metadata = {
  title: 'Isaak — Tu asistente fiscal inteligente',
  description:
    'Isaak te ayuda a entender qué pasa en tu negocio, priorizar lo importante y reducir errores fiscales usando contexto real. Disponible en Claude, ChatGPT y su propio workspace.',
};

export default function IsaakHomePage() {
  return <IsaakLandingClient />;
}
