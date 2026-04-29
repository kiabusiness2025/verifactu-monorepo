import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import IsaakChatMain from '../components/IsaakChatMain';

export const metadata: Metadata = { title: 'Equipo — Isaak' };

export default function IsaakEquipoPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
          <Layers size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Equipo</h1>
          <p className="text-[13px] text-slate-500">Empleados, proyectos y horas</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <IsaakChatMain
          context="equipo"
          welcomeTitle="Tu equipo y proyectos"
          welcomeSubtitle="Consulta el estado de proyectos, horas imputadas y empleados."
        />
      </div>
    </div>
  );
}
