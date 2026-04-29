import type { Metadata } from 'next';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Nuevo chat — Isaak' };

export default function IsaakNewChatPage() {
  return (
    <IsaakChatMain
      context="default"
      welcomeTitle="Hola, soy Isaak"
      welcomeSubtitle="Tu asistente financiero. Pregúntame cualquier cosa sobre tu negocio."
    />
  );
}
