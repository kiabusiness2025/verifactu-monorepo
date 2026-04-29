import type { Metadata } from 'next';
import { BarChart3, Clock, TrendingUp, Wallet } from 'lucide-react';
import IsaakChatSection from '../components/IsaakChatSection';

export const metadata: Metadata = { title: 'Resumen — Isaak' };

const KPI_CARDS = [
  { icon: TrendingUp, label: 'Facturado este mes', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Wallet, label: 'Cobrado este mes', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Clock, label: 'Pendiente de cobro', color: 'text-amber-600', bg: 'bg-amber-50' },
  {
    icon: BarChart3,
    label: 'IVA estimado trimestre',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
];

export default function ResumenPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <h1 className="text-[16px] font-semibold text-slate-900">Resumen de tu empresa</h1>
        <p className="text-[12px] text-slate-500">
          Estado general · datos en tiempo real desde Holded
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 xl:grid-cols-4">
        {KPI_CARDS.map(({ icon: Icon, label, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div
              className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon size={16} className={color} />
            </div>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-lg font-bold text-slate-300">—</p>
            <p className="mt-1 text-[11px] text-slate-400">Pregunta a Isaak →</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-hidden border-t border-slate-100">
        <IsaakChatSection
          context="resumen"
          welcomeTitle="¿Qué quieres analizar hoy?"
          welcomeSubtitle="Haz clic en una pregunta rápida o escribe tu consulta."
        />
      </div>
    </div>
  );
}
