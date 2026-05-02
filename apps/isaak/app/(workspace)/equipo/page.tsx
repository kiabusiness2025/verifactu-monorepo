import type { Metadata } from 'next';
import { Users2, Sparkles } from 'lucide-react';

export const metadata: Metadata = { title: 'Equipo — Isaak' };

export default function EquipoPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <Users2 size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Equipo</h1>
            <p className="text-[12px] text-slate-500">Empleados, proyectos y horas registradas</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2361d8]/10">
            <Users2 size={24} className="text-[#2361d8]" />
          </div>
          <p className="text-[16px] font-semibold text-[#011c67]">Vista de equipo</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            La tabla de empleados y proyectos estará disponible próximamente. Mientras tanto, usa el
            copiloto de Isaak para consultar tu equipo desde Holded.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-3 py-1.5 text-[12px] font-medium text-[#2361d8]">
              <Sparkles size={12} />
              Isaak copiloto disponible en el panel derecho
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-[12px] text-slate-500">
              <span>¿Cuántos empleados tenemos?</span>
              <span>·</span>
              <span>¿Proyectos activos?</span>
              <span>·</span>
              <span>¿Horas sin registrar?</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
