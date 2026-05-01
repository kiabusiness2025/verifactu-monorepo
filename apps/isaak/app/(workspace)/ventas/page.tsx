import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import VentasWorkspaceClient from './VentasWorkspaceClient';

export const metadata: Metadata = { title: 'Ventas — Isaak' };

export default function VentasPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <TrendingUp size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Ventas</h1>
            <p className="text-[12px] text-slate-500">Facturas emitidas, cobros y clientes</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <VentasWorkspaceClient />
      </div>
    </div>
  );
}
