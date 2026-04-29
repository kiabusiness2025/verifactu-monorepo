import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import IsaakChatSection from '../components/IsaakChatSection';

export const metadata: Metadata = { title: 'Ventas — Isaak' };

export default function VentasPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-900">Ventas</h1>
            <p className="text-[12px] text-slate-500">Facturas emitidas, cobros y clientes</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="ventas"
          welcomeTitle="Analiza tus ventas"
          welcomeSubtitle="Consulta facturas, cobros pendientes y rendimiento por cliente."
        />
      </div>
    </div>
  );
}
