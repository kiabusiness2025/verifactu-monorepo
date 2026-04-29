import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Ventas — Isaak' };

export default function IsaakVentasPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
          <TrendingUp size={18} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Ventas</h1>
          <p className="text-[13px] text-slate-500">Facturación, cobros y clientes</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatMain
          context="ventas"
          welcomeTitle="Ventas y facturación"
          welcomeSubtitle="Consulta tus facturas, cobros pendientes y el rendimiento por cliente."
        />
      </div>
    </div>
  );
}
