import Link from 'next/link';
import { Compass, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-9rem)] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_48%,#ffffff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl animate-fade-in">
        <section className="rounded-[2rem] border border-[#ff5460]/15 bg-white p-8 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
            <Sparkles className="h-3.5 w-3.5" />
            Página no encontrada
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Esta página ya no está aquí, pero el acceso bueno sigue muy cerca
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Puede ser un enlace antiguo o una redirección a medias. Vuelve al flujo principal y
            continúa desde el inicio, el acceso o el dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
            >
              Volver al inicio
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Compass className="h-4 w-4" />
              Abrir dashboard
            </Link>
            <Link
              href="/dashboard/integrations/holded"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Conector Holded
            </Link>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Verifactu.business
        </p>
      </div>
    </main>
  );
}
