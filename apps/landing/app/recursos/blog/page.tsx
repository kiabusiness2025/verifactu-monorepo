import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, Calendar, Sparkles } from "lucide-react";
import { getLandingUrl, getAppUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Blog | Verifactu Business",
  description: "Consejos practicos y novedades sobre facturacion, fiscalidad y gestion en 2026.",
};

const posts = [
  {
    title: "VeriFactu 2026 en 5 minutos",
  description: "Resumen claro de la obligación y cómo cumplir sin fricción.",
    meta: "Lectura 5 min",
  },
  {
    title: "Errores frecuentes en cierre 2025",
    description: "Como evitarlos y ahorrar tiempo en correcciones.",
    meta: "Checklist listo",
  },
  {
    title: "Arranque T1 2026 sin sustos",
    description: "Una rutina simple para ventas, gastos y evidencias.",
    meta: "Rutina mensual",
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
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
            <BookOpen className="h-4 w-4" />
            Recursos y actualidad
          </div>
          <h1 className="mt-4 text-4xl font-bold text-[#011c67]">Blog</h1>
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
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2361d8]/5 px-3 py-1 text-xs font-semibold text-[#2361d8]">
                <Calendar className="h-3.5 w-3.5" />
                {post.meta}
              </div>
              <h2 className="text-xl font-semibold text-[#011c67]">{post.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{post.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
                Leer pronto
                <ArrowRight className="h-4 w-4" />
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Sparkles className="h-4 w-4" />
            Pide un tema
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Dinos qué te preocupa y preparamos guías claras para tu caso.
          </p>
          <div className="mt-4">
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-5 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Proponer tema
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#planes"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Calcular precio
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


