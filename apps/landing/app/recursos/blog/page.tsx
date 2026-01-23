import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Blog | Verifactu Business",
  description: "Consejos practicos y novedades sobre facturacion, fiscalidad y gestion en 2026.",
};

const posts = [
  {
    title: "VeriFactu 2026 en 5 minutos",
    description: "Resumen claro de la obligacion y como cumplir sin friccion.",
  },
  {
    title: "Errores frecuentes en cierre 2025",
    description: "Como evitarlos y ahorrar tiempo en correcciones.",
  },
  {
    title: "Arranque T1 2026 sin sustos",
    description: "Una rutina simple para ventas, gastos y evidencias.",
  },
];

export default function BlogPage() {
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link
            href={getLandingUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#2361d8]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-[#2361d8]">Blog</h1>
          <p className="mt-4 text-lg text-slate-600">
            Ideas practicas para emitir, controlar y cumplir sin dolores de cabeza.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-[#2361d8]">{post.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{post.description}</p>
              <div className="mt-6 text-sm text-[#2361d8] hover:text-[#2361d8]">Leer pronto</div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#precios"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Ver planes
          </Link>
          <Link
            href={isaakChatUrl}
            className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Hablar con Isaak
          </Link>
        </div>
      </section>
    </main>
  );
}


