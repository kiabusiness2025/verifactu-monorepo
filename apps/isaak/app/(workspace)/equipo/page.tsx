import type { Metadata } from 'next';
import { Users2 } from 'lucide-react';
import IsaakChatSection from '../components/IsaakChatSection';

export const metadata: Metadata = { title: 'Equipo — Isaak' };

export default function EquipoPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
            <Users2 size={16} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-900">Equipo</h1>
            <p className="text-[12px] text-slate-500">Empleados, proyectos y horas registradas</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatSection
          context="equipo"
          welcomeTitle="Gestiona tu equipo"
          welcomeSubtitle="Consulta empleados, proyectos activos y horas registradas."
        />
      </div>
    </div>
  );
}
