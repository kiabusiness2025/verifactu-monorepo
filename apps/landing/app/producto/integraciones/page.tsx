import { ArrowRight, CheckCircle2, Plug, Rocket, Wrench } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getLandingUrl } from '../../lib/urls';

export const metadata: Metadata = {
  title: 'Integraciones | Verifactu Business',
  description:
    'Integraciones reales para operar mejor: Holded + ChatGPT y servicios profesionales de migracion liderados por Verifactu Business.',
};

const integrations = [
  {
    title: 'Holded + ChatGPT',
    description:
      'Primera integracion operativa de Verifactu Business para trabajar con contexto real en lenguaje claro.',
    icon: Rocket,
    href: '/producto/integraciones/isaak-for-holded',
    cta: 'Ver integracion',
  },
  {
    title: 'Servicios de migracion a Holded',
    description:
      'Migraciones guiadas de contabilidad a Holded para equipos que necesitan salir a produccion sin friccion.',
    icon: Wrench,
    href: '/servicios/migracion',
    cta: 'Ver servicios',
  },
  {
    title: 'Integraciones a medida',
    description:
      'Planificamos compatibilidades futuras cuando el caso de uso y el ROI estan claros.',
    icon: Plug,
    href: '/recursos/contacto',
    cta: 'Hablar con el equipo',
  },
];

export default function IntegracionesPage() {
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
              Integraciones para convertir datos reales en decisiones claras
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Empezamos por lo que ya aporta valor hoy: Holded + ChatGPT y servicios de migracion
              para pasar a Holded con control y acompanamiento.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/producto/integraciones/isaak-for-holded"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
              >
                Ver Holded + ChatGPT
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/servicios/migracion"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver servicios de migracion
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
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#1f55c0]"
                >
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-[#2361d8]/15 bg-white p-10">
            <h2 className="text-2xl font-semibold text-[#011c67]">
              Necesitas ayuda para migrar sin errores
            </h2>
            <p className="mt-4 text-slate-600">
              Te ayudamos a pasar a Holded con metodologia, checklist y acompanamiento en salida.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Diagnostico de origen y alcance de migracion.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Parametrizacion y validacion funcional y contable.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Acompanamiento de arranque y transferencia al equipo.
              </li>
            </ul>
            <div className="mt-6">
              <Link
                href="/servicios/migracion"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver paquetes de migracion
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
