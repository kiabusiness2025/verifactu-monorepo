'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, SectionTitle } from '@verifactu/ui';
import { Building2, Plus } from 'lucide-react';
import { useToast } from '@/components/notifications/ToastNotifications';
import { useAuth } from '@/hooks/useAuth';

const companies = [
  {
    id: 'demo',
    name: 'Empresa Demo SL',
    nif: 'B12345678',
    status: 'Demo',
    metrics: {
      ventas: '1.995,00 €',
      gastos: '638,40 €',
      beneficio: '1.356,60 €',
    },
  },
  {
    id: 'alpina',
    name: 'Grupo Alpina',
    nif: 'B82736455',
    status: 'Activa',
    metrics: {
      ventas: '8.420,00 €',
      gastos: '3.212,10 €',
      beneficio: '5.207,90 €',
    },
  },
  {
    id: 'norte',
    name: 'Servicios Norte',
    nif: 'B50483219',
    status: 'Activa',
    metrics: {
      ventas: '4.110,00 €',
      gastos: '1.990,00 €',
      beneficio: '2.120,00 €',
    },
  },
  {
    id: 'nova',
    name: 'Nova Retail',
    nif: 'B77291033',
    status: 'En prueba',
    metrics: {
      ventas: '2.760,00 €',
      gastos: '1.140,50 €',
      beneficio: '1.619,50 €',
    },
  },
];

const exercises = [
  { id: '2026', label: 'Ejercicio 2026' },
  { id: '2025', label: 'Ejercicio 2025' },
  { id: '2024', label: 'Ejercicio 2024' },
];

const isaakActionsByCompany: Record<
  string,
  { id: string; title: string; action: string; href: string }[]
> = {
  demo: [
    {
      id: 'invoice',
      title: 'Isaak, emite nueva factura venta',
      action: 'Nueva factura Veri*Factu',
      href: '/dashboard/invoices',
    },
    {
      id: 'expense',
      title: 'Contabiliza esta factura de gasto',
      action: 'Importar archivo',
      href: '/dashboard/documents',
    },
    {
      id: 'hacienda',
      title: 'Interpreta esta notificación de Hacienda',
      action: 'Subir documentos',
      href: '/dashboard/documents',
    },
  ],
  alpina: [
    {
      id: 'banking',
      title: 'Conciliar movimientos bancarios pendientes',
      action: 'Ir a Bancos',
      href: '/dashboard/banking',
    },
    {
      id: 'clients',
      title: 'Revisar clientes con facturas vencidas',
      action: 'Ver clientes',
      href: '/dashboard/customers',
    },
    {
      id: 'verifactu',
      title: 'Enviar facturas del día a Veri*Factu',
      action: 'Abrir facturas',
      href: '/dashboard/invoices',
    },
  ],
  norte: [
    {
      id: 'expense',
      title: 'Registrar gasto con factura escaneada',
      action: 'Subir documentos',
      href: '/dashboard/documents',
    },
    {
      id: 'calendar',
      title: 'Revisar próximos plazos fiscales',
      action: 'Ver calendario',
      href: '/dashboard/calendar',
    },
    {
      id: 'benefit',
      title: 'Actualizar resumen de beneficio mensual',
      action: 'Ver resumen',
      href: '/dashboard',
    },
  ],
  nova: [
    {
      id: 'sales',
      title: 'Emitir factura recurrente a clientes clave',
      action: 'Nueva factura',
      href: '/dashboard/invoices',
    },
    {
      id: 'docs',
      title: 'Guardar contrato mercantil reciente',
      action: 'Subir documento',
      href: '/dashboard/documents',
    },
    {
      id: 'tax',
      title: 'Preparar modelo trimestral con Isaak',
      action: 'Ver ajustes',
      href: '/dashboard/settings',
    },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const { info } = useToast();
  const { user } = useAuth();
  const [exerciseId, setExerciseId] = useState('2026');
  const [activeCompanyId, setActiveCompanyId] = useState('demo');
  const [isaakActions, setIsaakActions] = useState(isaakActionsByCompany.demo);

  const userName = user?.displayName || user?.email?.split('@')?.[0] || 'Usuario';

  const exerciseLabel = useMemo(() => {
    return exercises.find((item) => item.id === exerciseId)?.label ?? 'Ejercicio';
  }, [exerciseId]);

  const activeCompany = useMemo(() => {
    return companies.find((company) => company.id === activeCompanyId) ?? companies[0];
  }, [activeCompanyId]);
  useEffect(() => {
    let mounted = true;
    async function loadActions() {
      try {
        const res = await fetch(
          `/api/dashboard/actions?tenantId=${encodeURIComponent(activeCompanyId)}`,
          { credentials: 'include' }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok || !Array.isArray(data.actions)) {
          throw new Error('Invalid actions payload');
        }
        if (mounted) setIsaakActions(data.actions);
      } catch (error) {
        if (mounted) {
          setIsaakActions(isaakActionsByCompany[activeCompanyId] || isaakActionsByCompany.demo);
        }
      }
    }
    loadActions();
    return () => {
      mounted = false;
    };
  }, [activeCompanyId]);

  const handleAddCompany = () => {
    info(
      'Disponible con tu prueba',
      'Activa tu prueba para crear una empresa real y conectar tus datos.'
    );
    router.push('/dashboard/onboarding?next=/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs tracking-[0.35em] text-slate-400">INICIO</div>
          <div className="mt-1 text-lg font-semibold text-[#011c67]">Hola, {userName}</div>
          <div className="mt-2 text-sm text-slate-500">
            Resumen de tu empresa y acciones rápidas para hoy.
          </div>
        </div>
        <Button className="rounded-full" onClick={() => router.push('/dashboard/settings')}>
          Ver ajustes
        </Button>
      </div>

      <SectionTitle
        title="Tus empresas"
        right={
          <Button variant="outline" className="rounded-full" onClick={handleAddCompany}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir empresa
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4">
        <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-900">Perfiles</div>
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
              {companies.map((company) => {
                const active = company.id === activeCompanyId;
                return (
                  <button
                    key={company.id}
                    onClick={() => setActiveCompanyId(company.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-[#2361d8] bg-[#2361d8]/5'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{company.name}</div>
                        <div className="text-xs text-slate-500">NIF {company.nif}</div>
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">
                        {company.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#2361d8] font-medium">Ver perfil →</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#2361d8]/10 border border-[#2361d8]/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#2361d8]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{activeCompany.name}</div>
                  <div className="text-xs text-slate-500">NIF {activeCompany.nif}</div>
                </div>
              </div>
              <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">
                {activeCompany.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
              <span>{exerciseLabel} · Cifras estimadas</span>
              <select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Ventas</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {activeCompany.metrics.ventas}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Gastos</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {activeCompany.metrics.gastos}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">
                  Beneficio
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {activeCompany.metrics.beneficio}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionTitle title="Acciones con Isaak" />
      <div className="shadow-soft rounded-2xl border border-slate-200 bg-white">
        <div className="p-4 space-y-3">
          {isaakActions.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="text-xs text-slate-500">
                  Isaak preparará la acción y el borrador.
                </div>
              </div>
              <Link
                href={item.href}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#2361d8]/20 bg-[#2361d8]/10 px-4 text-xs font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/20"
              >
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
