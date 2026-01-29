'use client';

import { useToast } from '@/components/notifications/ToastNotifications';
import { AlertCircle, CheckCircle, FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

type ImportResult = {
  success: number;
  errors: number;
  details: {
    row: number;
    name: string;
    status: 'success' | 'error';
    message: string;
  }[];
};

export default function ImportWizardPage() {
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResult(null);
    } else {
      showError('Archivo inválido', 'Por favor selecciona un archivo CSV');
    }
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        success('Importación completada', `${data.success} registros importados exitosamente`);
      } else {
        showError('Error de importación', 'No se pudo procesar la importación');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de importación', 'No se pudo procesar la importación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Importar Empresas</h1>
        <p className="text-sm text-gray-600">Importa múltiples empresas usando un archivo CSV</p>
      </div>

      {/* Instrucciones */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
        <h2 className="font-semibold text-blue-900">Formato del CSV</h2>
        <p className="text-sm text-blue-800">
          El archivo debe contener las siguientes columnas (en la primera fila):
        </p>
        <code className="block text-xs bg-white border border-blue-200 rounded p-2 mt-2 overflow-x-auto">
          name,legal_name,tax_id,email,phone,address,city,postal_code,country
        </code>
        <p className="text-sm text-blue-800 mt-2">Ejemplo:</p>
        <code className="block text-xs bg-white border border-blue-200 rounded p-2 mt-1 overflow-x-auto">
          Mi Empresa,Mi Empresa SL,12345678A,info@empresa.es,912345678,Calle 1,Madrid,28001,ES
        </code>
      </div>

      {/* Selector de archivo */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center space-y-4">
        <FileUp className="h-12 w-12 text-gray-400 mx-auto" />
        <div>
          <p className="text-gray-900 font-medium">Selecciona un archivo CSV</p>
          <p className="text-sm text-gray-600">o arrastra un archivo aquí</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          aria-label="Seleccionar archivo CSV para importar"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Seleccionar Archivo
        </button>

        {file && (
          <div className="text-sm text-gray-600 mt-2">
            Archivo seleccionado: <span className="font-medium">{file.name}</span>
          </div>
        )}
      </div>

      {/* Botón de importar */}
      {file && !result && (
        <div className="flex justify-center">
          <button
            onClick={handleImport}
            disabled={loading}
            className="inline-flex rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Iniciar Importación'}
          </button>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Resultados de la Importación</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600">Importadas correctamente</p>
                    <p className="text-2xl font-bold text-green-700">{result.success}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-red-600">Con errores</p>
                    <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Detalles</h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.details.map((detail, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    detail.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  {detail.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {detail.name} <span className="text-gray-600">(fila {detail.row})</span>
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        detail.status === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {detail.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
