import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";
import { ArrowRight, Plug, Database, Building } from "lucide-react";

export const metadata: Metadata = {
  title: "Integraciones | Verifactu Business",
  description: "Conecta Verifactu Business con tus herramientas y centraliza la informacion.",
};

const integrations = [
  {
    title: "Bancos",
    description: "Conciliacion de movimientos y extractos bancarios.",
    icon: Building,
  },
  {
    title: "ERP y contabilidad",
    description: "Exportaciones y formatos estandar para asesorias.",
    icon: Database,
  },
  {
    title: "API propia",
    description: "Conecta tus sistemas con nuestro API cuando lo necesites.",
    icon: Plug,
  },
];

export default function IntegracionesPage() {
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

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-[#2361d8] sm:text-5xl">
              Integraciones para crecer sin friccion
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Conecta datos financieros, automatiza tareas y centraliza la informacion en un solo lugar. Isaak te ayuda
              a validar y ordenar el flujo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
              >
                Empezar 1 mes gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={isaakChatUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Hablar con Isaak
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            {integrations.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2361d8]/10">
                  <item.icon className="h-6 w-6 text-[#2361d8]" />
                </div>
                <h2 className="text-lg font-semibold text-[#2361d8]">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-[#2361d8]/15 bg-white p-10">
            <h2 className="text-2xl font-semibold text-[#2361d8]">
              Necesitas una integracion especifica
            </h2>
            <p className="mt-4 text-slate-600">
              Cuentanos tu caso y preparamos un plan con integraciones y soporte a medida.
            </p>
            <div className="mt-6">
              <Link
                href="/presupuesto"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Solicitar presupuesto
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}



