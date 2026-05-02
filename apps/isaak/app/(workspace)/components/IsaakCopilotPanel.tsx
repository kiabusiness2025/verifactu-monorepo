'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Sparkles } from 'lucide-react';
import IsaakChatSection from './IsaakChatSection';

type CopilotEntry = {
  context: string;
  title: string;
  subtitle: string;
};

const COPILOT_MAP: Record<string, CopilotEntry> = {
  '/ventas': {
    context: 'ventas',
    title: 'Isaak · Ventas',
    subtitle: '¿Facturas pendientes, cobros o análisis de clientes?',
  },
  '/gastos': {
    context: 'gastos',
    title: 'Isaak · Gastos',
    subtitle: '¿Cuánto gasté, proveedores pendientes o por categoría?',
  },
  '/contactos': {
    context: 'contactos',
    title: 'Isaak · Contactos',
    subtitle: '¿Mejores clientes, leads nuevos o facturas vencidas?',
  },
  '/resumen': {
    context: 'resumen',
    title: 'Isaak · Análisis',
    subtitle: '¿Cómo interpretas estas métricas o tendencias?',
  },
  '/equipo': {
    context: 'equipo',
    title: 'Isaak · Equipo',
    subtitle: '¿Empleados, proyectos activos o horas registradas?',
  },
  '/calendario': {
    context: 'fiscal',
    title: 'Isaak · Fiscal',
    subtitle: '¿Ayuda con declaraciones, plazos o modelos AEAT?',
  },
};

export default function IsaakCopilotPanel() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(true);

  const entry = Object.entries(COPILOT_MAP).find(
    ([key]) => pathname === key || pathname.startsWith(key + '/')
  )?.[1];

  // Don't render on chat pages or routes without a copilot context
  if (!entry || pathname === '/chat' || pathname.startsWith('/chat/')) return null;

  const { context, title, subtitle } = entry;

  if (!open) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-l border-slate-100 bg-white pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Abrir ${title}`}
          className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-[#2361d8] transition hover:bg-[#2361d8]/10"
        >
          <Sparkles size={15} />
          <ChevronRight size={11} className="rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-slate-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={13} className="shrink-0 text-[#2361d8]" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#011c67]">{title}</div>
            <div className="truncate text-[10px] text-slate-400">{subtitle}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Plegar copiloto"
          className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection context={context} welcomeTitle={title} welcomeSubtitle={subtitle} />
      </div>
    </div>
  );
}
