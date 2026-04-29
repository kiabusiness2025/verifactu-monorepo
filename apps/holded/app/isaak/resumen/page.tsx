import type { Metadata } from 'next';
import { BarChart3, Clock, TrendingUp, Wallet } from 'lucide-react';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Resumen — Isaak' };

const KPI_CARDS = [
  {
    icon: TrendingUp,
    label: 'Facturado este mes',
    value: '—',
    change: null,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    query: '¿Cuánto he facturado este mes?',
  },
  {
    icon: Wallet,
    label: 'Cobrado este mes',
    value: '—',
    change: null,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    query: '¿Cuánto he cobrado realmente este mes?',
  },
  {
    icon: Clock,
    label: 'Pendiente de cobro',
    value: '—',
    change: null,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    query: '¿Qué facturas tengo pendientes de cobro?',
  },
  {
    icon: BarChart3,
    label: 'IVA estimado T actual',
    value: '—',
    change: null,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    query: '¿Cuánto IVA debo pagar este trimestre?',
  },
];

export default function IsaakResumenPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <h1 className="text-[17px] font-semibold text-slate-900">Resumen de tu empresa</h1>
        <p className="text-[13px] text-slate-500">
          Estado general · datos en tiempo real desde Holded
        </p>
      </div>

      {/* KPI grid — click a card to open the chat with that query */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 xl:grid-cols-4">
        {KPI_CARDS.map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon size={18} className={color} />
            </div>
            <p className="text-[12px] font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-xl font-bold text-slate-300">{value}</p>
            <p className="mt-1 text-[11px] text-slate-400">Pregunta a Isaak →</p>
          </div>
        ))}
      </div>

      {/* Chat below */}
      <div className="flex-1 overflow-hidden border-t border-slate-100">
        <IsaakChatMain
          context="default"
          welcomeTitle="¿Qué quieres analizar hoy?"
          welcomeSubtitle="Haz clic en un KPI o escribe tu consulta."
        />
      </div>
    </div>
  );
}
