import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog | Verifactu Business",
  description:
    "Consejos prÃ¡cticos y novedades sobre facturaciÃ³n, fiscalidad y gestiÃ³n.",
};

const posts = [
  {
    title: "VeriFactu en 5 minutos",
    description: "Resumen claro de la obligaciÃ³n y cÃ³mo cumplir sin fricciÃ³n.",
  },
  {
    title: "Errores frecuentes al emitir facturas",
    description: "CÃ³mo evitarlos y ahorrar tiempo en correcciones.",
  },
  {
    title: "Control de gastos sin complicaciones",
    description: "Una rutina mensual simple y efectiva.",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/70 via-white to-white">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            â† Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-[#002060]">Blog</h1>
          <p className="mt-4 text-lg text-slate-600">
            Ideas prÃ¡cticas para emitir, controlar y cumplir sin dolores de cabeza.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-[#002060]">
                {post.title}
              </h2>
              <p className="mt-3 text-sm text-slate-600">{post.description}</p>
              <div className="mt-6 text-sm text-[#0060F0] hover:text-[#0080F0]">
                Leer pronto
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#precios"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 text-sm font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]"
          >
            Ver planes
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-xl border border-[#0060F0] px-6 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
          >
            Solicitar demo
          </Link>
        </div>
      </section>
    </main>
  );
}

