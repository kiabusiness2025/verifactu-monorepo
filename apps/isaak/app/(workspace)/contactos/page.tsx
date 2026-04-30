import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import IsaakChatSection from '../components/IsaakChatSection';

export const metadata: Metadata = { title: 'Contactos — Isaak' };

export default function ContactosPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <Users size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Contactos</h1>
            <p className="text-[12px] text-slate-500">Clientes, proveedores y leads del CRM</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="contactos"
          welcomeTitle="Gestiona tus contactos"
          welcomeSubtitle="Consulta clientes, actividad y oportunidades del CRM."
        />
      </div>
    </div>
  );
}
