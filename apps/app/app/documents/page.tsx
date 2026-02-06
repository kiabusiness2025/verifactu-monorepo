import { DocumentsUpload } from '@/components/documents/DocumentsUpload';

export default function DocumentsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-slate-900">Documentos</h1>
      <p className="mt-2 text-sm text-slate-600">
        Aquí verás tus documentos organizados.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        <DocumentsUpload />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-700">Aún no hay documentos para mostrar.</p>
        </div>
      </div>
    </main>
  );
}
