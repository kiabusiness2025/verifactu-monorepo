import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Contactos — Isaak' };

export default function IsaakContactosPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <Users size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Contactos</h1>
          <p className="text-[13px] text-slate-500">Clientes, proveedores y oportunidades CRM</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatMain
          context="contactos"
          welcomeTitle="Clientes y proveedores"
          welcomeSubtitle="Consulta el historial de un cliente, sus facturas pendientes o busca un proveedor."
        />
      </div>
    </div>
  );
}
