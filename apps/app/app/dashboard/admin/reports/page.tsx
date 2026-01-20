'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleInput, AccessibleSelect } from '@/components/accessibility/AccessibleInput';
import { CardSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { useToast } from '@/components/notifications/ToastNotifications';
import { Calendar, Download, FileText, Mail } from 'lucide-react';
import { useState } from 'react';

export default function ReportsPage() {
  const { success, error: showError } = useToast();
  const [generating, setGenerating] = useState(false);

  const reportTypes = [
    {
      title: 'Balance General',
      description: 'Estado financiero consolidado de todas las empresas',
      icon: FileText,
      action: 'generate-balance',
    },
    {
      title: 'Modelo 390',
      description: 'Declaración-resumen anual de operaciones con terceros',
      icon: FileText,
      action: 'generate-390',
    },
    {
      title: 'Modelo 303',
      description: 'Declaración mensual de IVA',
      icon: FileText,
      action: 'generate-303',
    },
    {
      title: 'Reporte de Clientes',
      description: 'Detalle de facturas y pagos por cliente',
      icon: FileText,
      action: 'generate-clients',
    },
  ];

  async function handleGenerateReport(type: string) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/reports?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.pdf`;
        a.click();
        success('Reporte generado exitosamente');
      } else {
        showError('Error al generar el reporte');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-600">Generar reportes y modelos fiscales</p>
      </div>

      {/* Reportes disponibles */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon;

          return (
            <div
              key={report.action}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>

                  <AccessibleButton
                    onClick={() => handleGenerateReport(report.action)}
                    loading={generating}
                    disabled={generating}
                    icon={<Download className="h-4 w-4" />}
                    ariaLabel={`Descargar reporte de ${report.title}`}
                  >
                    Descargar PDF
                  </AccessibleButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Envío de reportes */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Enviar Reportes a Clientes</h3>
        </div>

        <p className="text-sm text-gray-600">
          Envía reportes mensuales automáticamente a las empresas registradas
        </p>

        <div className="space-y-3">
          <div>
            <AccessibleSelect label="Periodo de reporte" value="mes-anterior" onChange={() => {}}>
              <option value="mes-anterior">Mes anterior</option>
              <option value="este-mes">Este mes</option>
              <option value="trimestre-anterior">Trimestre anterior</option>
            </AccessibleSelect>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje adicional (opcional)
            </label>
            <textarea
              placeholder="Escribe un mensaje personalizado..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Mensaje adicional para reportes"
            />
          </div>

          <AccessibleButton
            icon={<Mail className="h-4 w-4" />}
            ariaLabel="Enviar reportes a todas las empresas"
          >
            Enviar Reportes a Todos
          </AccessibleButton>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Historial Reciente</h3>

        <div className="space-y-2 text-sm">
          {[
            { date: 'Hoy, 14:30', type: 'Balance General', status: 'Descargado' },
            { date: 'Ayer, 10:15', type: 'Modelo 303', status: 'Enviado a 5 empresas' },
            { date: '2 días atrás, 09:45', type: 'Reporte de Clientes', status: 'Descargado' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{item.type}</p>
                  <p className="text-xs text-gray-600">{item.date}</p>
                </div>
              </div>
              <span className="text-xs text-gray-600">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
