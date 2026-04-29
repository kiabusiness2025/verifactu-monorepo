import type { Metadata } from 'next';
import IsaakChatSection from '../components/IsaakChatSection';

export const metadata: Metadata = { title: 'Chat — Isaak' };

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <h1 className="text-[16px] font-semibold text-slate-900">Chat con Isaak</h1>
        <p className="text-[12px] text-slate-500">Pregunta lo que necesites sobre tu negocio</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="default"
          welcomeTitle="Hola, soy Isaak"
          welcomeSubtitle="Tu copiloto de negocio. Pregúntame por ventas, gastos, cobros o cualquier duda."
        />
      </div>
    </div>
  );
}
