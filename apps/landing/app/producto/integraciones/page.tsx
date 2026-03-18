import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";
import { ArrowRight, Plug, Database, Building, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Integraciones | Verifactu Business",
  description: "Conecta Verifactu Business con tus herramientas y centraliza la información.",
};

const integrations = [
  {
    title: "Programa contable vía API",
    description: "Conecta API Key por tenant y sincroniza clientes, productos, presupuestos, facturas y gastos.",
    icon: Database,
  },
  {
    title: "Bancos",
    description: "Lectura de movimientos desde tu integración contable para conciliación guiada por Isaak.",
    icon: Building,
  },
  {
    title: "ERP y contabilidad",
    description: "Verifactu manda en operación diaria y se integra con tu stack contable cuando activas API.",
    icon: Database,
  },
  {
    title: "API propia",
    description: "Conecta tus sistemas con nuestra API cuando lo necesites.",
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <Plug className="h-4 w-4 text-[#2361d8]" />
              Producto · Integraciones
            </div>
            <h1 className="text-4xl font-bold text-[#011c67] sm:text-5xl">
              Integraciones para crecer sin fricción
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Verifactu.business funciona como capa empresarial y se conecta con tu programa de
              contabilidad vía API. Isaak ordena el flujo y te propone acciones sin exponer menús contables complejos.
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
                <h2 className="text-lg font-semibold text-[#011c67]">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                  Isaak for Holded
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-[#011c67] sm:text-3xl">
                  La primera integracion publica candidata de Isaak
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Hemos preparado una version publica enfocada en facturas, cuentas, CRM y proyectos,
                  con OAuth propio, tenant autorizado y escritura controlada por confirmacion.
                </p>
              </div>
              <div>
                <Link
                  href="/producto/integraciones/isaak-for-holded"
                  className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-5 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Ver ficha publica
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#2361d8]/15 bg-white p-10">
            <h2 className="text-2xl font-semibold text-[#011c67]">
              Necesitas una integración específica
            </h2>
            <p className="mt-4 text-slate-600">
              Cuéntanos tu caso y preparamos un plan con integraciones y soporte a medida.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Conexión segura por API Key (solo server-side).
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Outbox con reintentos e idempotencia para sincronización robusta.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Acompañamiento en migración, eInforma y soporte operativo.
              </li>
            </ul>
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

