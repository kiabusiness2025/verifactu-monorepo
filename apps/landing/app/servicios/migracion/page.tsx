import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Footer } from '../../lib/home/ui';
import { getMigrationCheckoutHref, MIGRATION_SERVICES } from '../../lib/migration-services';

export const metadata: Metadata = {
  title: 'Servicios de Migracion | Verifactu Business',
  description:
    'Migramos tu contabilidad a Holded con metodologia clara, validacion de datos y acompanamiento en salida.',
};

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Servicios', href: '/servicios/migracion' },
  { label: 'Integraciones', href: '/producto/integraciones' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const guarantees = [
  'Alcance cerrado antes de ejecutar la migracion.',
  'Checklist de validacion funcional y contable.',
  'Seguimiento en salida para evitar bloqueos operativos.',
];

export default function MigracionServiciosPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <main>
        <section className="bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_50%)] py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                Servicios profesionales
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
                Migramos tu contabilidad a Holded sin romper tu operacion
              </h1>
              <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
                En lugar de prometer herramientas futuras, te ayudamos a resolver hoy una necesidad
                real: pasar de tu sistema actual a Holded con datos limpios, control y
                acompanamiento.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/recursos/contacto"
                  className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
                >
                  Solicitar diagnostico
                </Link>
                <Link
                  href="/producto/integraciones"
                  className="inline-flex items-center justify-center rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Ver integraciones
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {MIGRATION_SERVICES.map((service) => (
                <article
                  key={service.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Servicio de migracion
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-[#011c67]">{service.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{service.subtitle}</p>
                  <div className="mt-4 text-3xl font-bold text-[#011c67]">
                    Desde {service.priceFromEur} EUR
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{service.outcome}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {service.includes.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      href={getMigrationCheckoutHref(service.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                    >
                      Reservar servicio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/recursos/contacto"
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Hablar con el equipo
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9">
              <div className="flex items-center gap-2 text-[#011c67]">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-xl font-semibold">Como trabajamos cada migracion</h3>
              </div>
              <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                {guarantees.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
