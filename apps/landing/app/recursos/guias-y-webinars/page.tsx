import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GuÃ­as y webinars | Verifactu Business",
  description:
    "Recursos para cumplir VeriFactu, optimizar facturaciÃ³n y mejorar la gestiÃ³n diaria.",
};

const guides = [
  {
    title: "GuÃ­a rÃ¡pida VeriFactu",
    description: "QuÃ© exige la AEAT y cÃ³mo cumplir sin errores.",
  },
  {
    title: "Cierre mensual sin sorpresas",
    description: "Pasos para revisar ventas, gastos y beneficio.",
  },
  {
    title: "Checklist de facturaciÃ³n",
    description: "Los 10 puntos que evitan rechazos y sanciones.",
  },
];

export default function GuiasPage() {
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
        <h1 className="text-4xl font-bold text-[#002060]">GuÃ­as y webinars</h1>
        <p className="mt-4 text-lg text-slate-600">
          Recursos claros, en lenguaje llano, para que cumplas VeriFactu y
          tengas control real de tu negocio.
        </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {guides.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-[#002060]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              <div className="mt-6 text-sm text-[#0060F0] hover:text-[#0080F0]">
                PrÃ³ximamente
              </div>
            </div>
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

