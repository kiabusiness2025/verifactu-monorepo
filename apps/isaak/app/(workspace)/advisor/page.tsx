import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import AdvisorDashboardClient from './AdvisorDashboardClient';
import AdvisorDashboardSummary from './AdvisorDashboardSummary';

export const metadata: Metadata = { title: 'Mis clientes — Isaak' };

export default function AdvisorPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <Building2 size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Mis clientes</h1>
            <p className="text-[12px] text-slate-500">Empresas que gestionas como asesor</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* V1.9.2 — Cabecera resumen con KPIs y atajos */}
        <AdvisorDashboardSummary />
        <AdvisorDashboardClient />
      </div>
    </div>
  );
}
