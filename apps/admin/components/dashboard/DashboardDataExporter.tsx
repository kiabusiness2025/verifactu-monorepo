/**
 * Dashboard Data Export Component
 * Allows users to export dashboard data in multiple formats (CSV, JSON, PDF)
 * with proper loading states and error handling
 */

'use client';

import {
  CheckCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { AccessibleButton } from '../accessibility/AccessibleButton';

type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface ExportStatus {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

export default function DashboardDataExporter() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ status: 'idle' });
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');

  const handleExport = async (format: ExportFormat) => {
    setExportStatus({
      status: 'loading',
      message: `Preparando exportación ${format.toUpperCase()}...`,
    });

    try {
      // Call export API endpoint
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filename: `dashboard-export-${Date.now()}`,
          includeHeaders: true,
        } as ExportOptions),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus({
        status: 'success',
        message: `Exportación completada: ${a.download}`,
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus({ status: 'idle' });
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error al exportar datos',
      });

      // Reset status after 5 seconds
      setTimeout(() => {
        setExportStatus({ status: 'idle' });
      }, 5000);
    }
  };

  const exportFormats: Array<{
    format: ExportFormat;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      format: 'csv',
      label: 'CSV',
      description: 'Compatible con Excel y hojas de cálculo',
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
    {
      format: 'json',
      label: 'JSON',
      description: 'Formato estructurado para integraciones',
      icon: <FileJson className="h-5 w-5" />,
    },
    {
      format: 'pdf',
      label: 'PDF',
      description: 'Documento listo para imprimir',
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Exportar Datos del Dashboard</h3>
          <p className="mt-1 text-sm text-slate-600">
            Descarga tus datos en el formato que prefieras
          </p>
        </div>
        <Download className="h-5 w-5 text-slate-400" />
      </div>

      {/* Format Selection */}
      <div className="space-y-3 mb-6">
        {exportFormats.map(({ format, label, description, icon }) => (
          <button
            key={format}
            onClick={() => setSelectedFormat(format)}
            className={`w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
              selectedFormat === format
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            aria-pressed={selectedFormat === format}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                selectedFormat === format ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{label}</div>
              <div className="text-sm text-slate-600">{description}</div>
            </div>
            <div
              className={`h-5 w-5 rounded-full border-2 ${
                selectedFormat === format ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}
            >
              {selectedFormat === format && <CheckCircle className="h-full w-full text-white" />}
            </div>
          </button>
        ))}
      </div>

      {/* Status Message */}
      {exportStatus.status !== 'idle' && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            exportStatus.status === 'loading'
              ? 'bg-blue-50 text-blue-800'
              : exportStatus.status === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            {exportStatus.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {exportStatus.status === 'success' && <CheckCircle className="h-5 w-5" />}
            {exportStatus.status === 'error' && <XCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{exportStatus.message}</span>
          </div>
        </div>
      )}

      {/* Export Button */}
      <AccessibleButton
        onClick={() => handleExport(selectedFormat)}
        disabled={exportStatus.status === 'loading'}
        loading={exportStatus.status === 'loading'}
        className="w-full"
        ariaLabel={`Exportar datos en formato ${selectedFormat.toUpperCase()}`}
      >
        <Download className="h-4 w-4" />
        Exportar en {selectedFormat.toUpperCase()}
      </AccessibleButton>

      {/* Additional Info */}
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <strong>Nota:</strong> La exportación incluye todos los datos visibles en tu dashboard
        actual. Para exportaciones personalizadas, contacta con soporte.
      </div>
    </div>
  );
}
