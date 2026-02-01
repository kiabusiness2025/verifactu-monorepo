'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@verifactu/ui/components/ui/button';
import { Card, CardContent } from '@verifactu/ui/components/ui/card';
import { NoticeCard, SectionTitle } from '@verifactu/ui';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { useToast } from '@/components/notifications/ToastNotifications';

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

export default function DashboardPage() {
  const router = useRouter();
  const { info } = useToast();
  const [exerciseId, setExerciseId] = useState('2026');
  const [activeCompanyId, setActiveCompanyId] = useState('demo');

  const exerciseLabel = useMemo(() => {
    return exercises.find((item) => item.id === exerciseId)?.label ?? 'Ejercicio';
  }, [exerciseId]);

  const activeCompany = useMemo(() => {
    return companies.find((company) => company.id === activeCompanyId) ?? companies[0];
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
      <Card className="shadow-soft rounded-2xl border-slate-200">
        <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs tracking-[0.35em] text-slate-400">INICIO</div>
            <div className="mt-1 text-lg font-semibold text-[#011c67]">Resumen de tu empresa</div>
            <div className="mt-2 text-sm text-slate-500">
              Ventas, gastos y beneficio estimado en tiempo real.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white px-4 pr-9 text-sm text-slate-700 shadow-sm focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <Button className="rounded-full" onClick={() => router.push('/dashboard/settings')}>
              Ver ajustes
            </Button>
          </div>
        </CardContent>
      </Card>

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
        <Card className="shadow-soft rounded-2xl border-slate-200">
          <CardContent className="p-5 space-y-4">
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
          </CardContent>
        </Card>

        <Card className="shadow-soft rounded-2xl border-slate-200">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
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

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
              {exerciseLabel} · Cifras estimadas
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
          </CardContent>
        </Card>
      </div>

      <SectionTitle title="Avisos" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NoticeCard
          label="Resumen"
          text="Tu beneficio estimado está actualizado con las facturas de hoy."
        />
        <NoticeCard
          label="Veri*Factu"
          text="Recuerda revisar los plazos de emisión para cumplir con la AEAT."
        />
      </div>
    </div>
  );
}
