import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookies | Isaak para Holded',
  description: 'Informacion sobre cookies y almacenamiento local en holded.verifactu.business.',
};

export default function HoldedCookiesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_45%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="inline-flex rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            Cookies
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            Uso de cookies y almacenamiento local
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
            <p>
              Este sitio utiliza cookies tecnicas y almacenamiento local para mantener la sesion, el
              acceso del usuario y preferencias basicas del flujo de autenticacion.
            </p>
            <p>
              En esta release gratuita no se muestra un panel avanzado de configuracion de cookies
              ni se activan modulos comerciales propios visibles desde la UX principal.
            </p>
            <p>
              Si se activan herramientas adicionales de analitica o marketing, esta pagina y los
              avisos correspondientes deberan actualizarse antes de su publicacion.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
