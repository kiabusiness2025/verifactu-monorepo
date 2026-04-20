import Link from 'next/link';

export default function AdminNotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            Ruta no encontrada
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Esta vista del panel ya no esta disponible
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Puede ser un acceso antiguo o una ruta que ya no forma parte del panel operativo. Vuelve
            al panel principal para seguir trabajando.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/panel"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir al panel
            </Link>
            <Link
              href="/users"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver usuarios
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
