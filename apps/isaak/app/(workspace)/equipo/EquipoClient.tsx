'use client';

import { useEffect, useState } from 'react';
import { Users2, Briefcase } from 'lucide-react';

type Employee = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  department: string | null;
  status: string;
  startDate: string | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  billable: boolean;
  budget: number | null;
  totalCost: number | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  const ts = Number(s);
  const d = ts > 1e9 ? new Date(ts * 1000) : new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusDot({ status }: { status: string }) {
  const isActive = ['active', 'open', 'in_progress', 'inprogress'].includes(
    status.toLowerCase().replace(/[- ]/g, '_')
  );
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
      />
      <span className="text-xs text-slate-500 capitalize">{status}</span>
    </span>
  );
}

export default function EquipoClient() {
  const [tab, setTab] = useState<'employees' | 'projects'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [noHolded, setNoHolded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/equipo/list?tab=${tab}`)
      .then(async (r) => {
        if (r.status === 422) {
          setNoHolded(true);
          return;
        }
        const d = await r.json();
        if (!d.ok) return;
        if (d.tab === 'employees') setEmployees(d.employees);
        if (d.tab === 'projects') setProjects(d.projects);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  if (noHolded) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-slate-500">Conecta tu ERP para ver tu equipo y proyectos.</p>
        <a
          href="/settings/connections"
          className="rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a4fc4]"
        >
          Conectar Holded
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 bg-[#fafbff] px-4 py-2">
        <button
          onClick={() => setTab('employees')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'employees' ? 'bg-[#2361d8] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users2 size={14} />
          Empleados
          {!loading && tab === 'employees' && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{employees.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('projects')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'projects' ? 'bg-[#2361d8] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase size={14} />
          Proyectos
          {!loading && tab === 'projects' && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{projects.length}</span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            Cargando…
          </div>
        ) : tab === 'employees' ? (
          employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <Users2 size={32} className="text-slate-200" />
              <p className="text-sm text-slate-400">Sin empleados en Holded.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#fafbff]">
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="hidden px-4 py-3 md:table-cell">Cargo</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Departamento</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Email</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="hidden px-4 py-3 md:table-cell">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-[#011c67]">{e.name || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {e.role ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                      {e.department ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                      {e.email ? (
                        <a
                          href={`mailto:${e.email}`}
                          className="hover:text-[#2361d8] hover:underline"
                        >
                          {e.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot status={e.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {fmtDate(e.startDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Briefcase size={32} className="text-slate-200" />
            <p className="text-sm text-slate-400">Sin proyectos en Holded.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#fafbff]">
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="hidden px-4 py-3 md:table-cell">Inicio</th>
                <th className="hidden px-4 py-3 md:table-cell">Fin</th>
                <th className="hidden px-4 py-3 lg:table-cell">Facturable</th>
                <th className="px-4 py-3 text-right">Presupuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-[#011c67]">{p.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusDot status={p.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {fmtDate(p.startDate)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {fmtDate(p.endDate)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.billable
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.billable ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {p.budget !== null ? fmt(p.budget) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
