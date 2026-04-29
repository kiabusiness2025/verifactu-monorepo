import type { Metadata } from 'next';
import { TrendingDown } from 'lucide-react';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Gastos — Isaak' };

export default function IsaakGastosPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
          <TrendingDown size={18} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Gastos</h1>
          <p className="text-[13px] text-slate-500">Compras, proveedores y pagos pendientes</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatMain
          context="gastos"
          welcomeTitle="Gastos y compras"
          welcomeSubtitle="Analiza tus facturas de proveedor, pagos pendientes y distribución de gastos."
        />
      </div>
    </div>
  );
}
