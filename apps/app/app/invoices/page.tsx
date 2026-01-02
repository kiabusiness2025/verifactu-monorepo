export default function InvoicesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-slate-900">Facturas</h1>
      <p className="mt-2 text-sm text-slate-600">
        Aquí verás tus facturas y su estado.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-700">Aún no hay facturas para mostrar.</p>
      </div>
    </main>
  );
}
