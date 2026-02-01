'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@verifactu/ui/components/ui/button';
import { Card, CardContent } from '@verifactu/ui/components/ui/card';
import { NoticeCard, SectionTitle } from '@verifactu/ui';
import { Plus, Building2 } from 'lucide-react';
import { useToast } from '@/components/notifications/ToastNotifications';

const demoCompany = {
  id: 'demo',
  name: 'Empresa Demo SL',
  nif: 'B12345678',
  status: 'Demo',
  metrics: {
    ventas: '1.995,00 €',
    gastos: '638,40 €',
    beneficio: '1.356,60 €',
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { info } = useToast();

  const handleAddCompany = () => {
    info(
      'Disponible con tu prueba',
      'Activa tu prueba para crear una empresa real y conectar tus datos.'
    );
    router.push('/dashboard/onboarding?next=/dashboard');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft rounded-2xl">
        <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs tracking-[0.3em] text-slate-400">INICIO</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Resumen de tu empresa</div>
            <div className="mt-2 text-sm text-slate-500">
              Ventas, gastos y beneficio estimado en tiempo real.
            </div>
          </div>
          <Button className="rounded-full" onClick={() => router.push('/dashboard/settings')}>
            Ver ajustes
          </Button>
        </CardContent>
      </Card>

      <SectionTitle
        title="Tus empresas"
        right={
          <Button variant="outline" className="rounded-full" onClick={handleAddCompany}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir empresa
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-soft rounded-2xl border-slate-200">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#2361d8]/10 border border-[#2361d8]/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#2361d8]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{demoCompany.name}</div>
                  <div className="text-xs text-slate-500">NIF {demoCompany.nif}</div>
                </div>
              </div>
              <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">
                {demoCompany.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Ventas</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {demoCompany.metrics.ventas}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">Gastos</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {demoCompany.metrics.gastos}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400">
                  Beneficio
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {demoCompany.metrics.beneficio}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft rounded-2xl border-dashed border-slate-200">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="text-sm font-semibold text-slate-900">Añade otra empresa</div>
              <div className="mt-1 text-sm text-slate-500">
                Importa datos reales y activa tu prueba de 30 días.
              </div>
            </div>
            <Button className="mt-4 rounded-full w-fit" onClick={handleAddCompany}>
              Activar prueba
            </Button>
          </CardContent>
        </Card>
      </div>

      <SectionTitle title="Avisos de Isaak" />
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
