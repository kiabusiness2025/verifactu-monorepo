import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  Hotel,
  MessageSquare,
  Puzzle,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getIsaakUrl } from '../lib/urls';

export const metadata: Metadata = {
  title: 'Integraciones sectoriales | Isaak',
  description:
    'Isaak obtiene los datos de tu software habitual — HotelGest, Revo XEF, Nubimed, Inmovilla — y los convierte en asesoramiento fiscal y de negocio en tiempo real.',
  openGraph: {
    title: 'Integraciones sectoriales | Isaak',
    description:
      'Isaak conecta con el software de gestión de tu sector — hoteles, clínicas, restaurantes, inmobiliarias y más.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/integraciones',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Suscripciones', href: '/suscripciones' },
  { label: 'Developers', href: '/developers' },
  { label: 'Contacto', href: '/contacto' },
];

const sectorConnectors = [
  {
    icon: Hotel,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'HotelGest — Hoteles',
    body: 'Conecta tu PMS HotelGest con Isaak. Reservas, ocupación, RevPAR, facturación e IVA hostelería en tiempo real. Isaak prepara el modelo 303 con el desglose correcto automáticamente.',
    cta: 'Ver integración',
    href: '/integraciones/hotelgest',
    external: false,
  },
  {
    icon: Building2,
    status: 'Próximo',
    statusColor: 'bg-amber-100 text-amber-800',
    title: 'Inmovilla — Inmobiliarias',
    body: 'La gestión de tu agencia inmobiliaria conectada con Isaak. Operaciones, comisiones, retenciones IRPF y arrendamientos en un solo chat. El estándar de facto en España.',
    cta: 'Apuntarse a beta',
    href: '/contacto',
    external: false,
  },
  {
    icon: UtensilsCrossed,
    status: 'Próximo',
    statusColor: 'bg-amber-100 text-amber-800',
    title: 'Revo XEF — Restaurantes',
    body: 'Tu TPV Revo conectado con Isaak. Cierres diarios, IVA reducido al 10%, desglose por servicio y modelo 303 trimestral automático. Para restaurantes, bares y hostelería.',
    cta: 'Apuntarse a beta',
    href: '/contacto',
    external: false,
  },
  {
    icon: Stethoscope,
    status: 'Próximo',
    statusColor: 'bg-amber-100 text-amber-800',
    title: 'Nubimed — Clínicas y dentistas',
    body: 'Gestión fiscal de tu clínica desde Isaak. Servicios sanitarios exentos vs 21% IVA, retenciones a profesionales y facturación a pacientes — con el desglose correcto para Hacienda.',
    cta: 'Apuntarse a beta',
    href: '/contacto',
    external: false,
  },
  {
    icon: Bot,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Isaak — Asistente nativo',
    body: 'Isaak sin conector externo. Chat fiscal, VeriFactu, alertas AEAT, open banking y modelos AEAT directamente en isaak.verifactu.business con IA incluida en el precio.',
    cta: 'Abrir Isaak',
    href: 'https://isaak.verifactu.business',
    external: true,
  },
  {
    icon: Code2,
    status: 'Beta',
    statusColor: 'bg-blue-100 text-blue-800',
    title: 'Isaak Platform API + MCP',
    body: 'API REST y protocolo MCP para que tu software sectorial conecte directamente con Isaak. Facturas, VeriFactu y contabilidad desde cualquier entorno con Bearer token.',
    cta: 'Ver documentación developer',
    href: '/developers',
    external: false,
  },
  {
    icon: MessageSquare,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'WhatsApp Business',
    body: 'Recibe alertas fiscales, responde consultas de Isaak y aprueba acciones contables desde WhatsApp. Tu negocio en el bolsillo.',
    cta: 'Saber más',
    href: 'https://isaak.verifactu.business',
    external: true,
  },
  {
    icon: Zap,
    status: 'Próximo',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'TeamUp · Loyverse · RepairShopr',
    body: 'Gimnasios, comercio/retail y talleres mecánicos. El ecosistema sectorial de Isaak crece trimestre a trimestre según la demanda real de los usuarios.',
    cta: 'Solicitar integración',
    href: '/contacto',
    external: false,
  },
  {
    icon: Puzzle,
    status: 'Siempre',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'Tu sector no está en la lista',
    body: 'Si tu software de gestión tiene API, podemos integrarlo. Cuéntanos qué usas y añadimos tu sector al roadmap. Las mejores integraciones nacen de una necesidad real.',
    cta: 'Solicitar integración',
    href: '/contacto',
    external: false,
  },
];

const sectorList = [
  { name: 'HotelGest', sector: 'Hoteles', status: '✓ Activo' },
  { name: 'Inmovilla', sector: 'Inmobiliarias', status: 'Q3 2026' },
  { name: 'Revo XEF', sector: 'Restaurantes', status: 'Q3 2026' },
  { name: 'Nubimed', sector: 'Clínicas / Dental', status: 'Q3 2026' },
  { name: 'TeamUp', sector: 'Gimnasios', status: 'Q4 2026' },
  { name: 'Loyverse POS', sector: 'Comercio / Retail', status: 'Q4 2026' },
  { name: 'RepairShopr', sector: 'Talleres mecánicos', status: 'Q4 2026' },
];

export default function IntegracionesPage() {
  const isaakUrl = getIsaakUrl();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              <Sparkles className="h-3.5 w-3.5" />
              Integraciones sectoriales
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              La capa de inteligencia
              <br />
              encima del software
              <br />
              que ya usas.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Tu hotel ya tiene HotelGest. Tu restaurante ya tiene Revo. Tu clínica ya tiene
              Nubimed. Isaak no sustituye tu software — se convierte en la inteligencia que lo
              conecta todo y te dice qué hacer a continuación.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={isaakUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Abrir Isaak
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Solicitar mi sector
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Roadmap table */}
      <section className="border-b border-slate-100 bg-slate-50 py-12">
        <Container>
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Roadmap de integraciones sectoriales
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-6">Software</th>
                  <th className="pb-3 pr-6">Sector</th>
                  <th className="pb-3">Disponibilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sectorList.map((s) => (
                  <tr key={s.name}>
                    <td className="py-3 pr-6 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 pr-6 text-slate-600">{s.sector}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          s.status.startsWith('✓')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Connectors grid */}
      <section className="py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectorConnectors.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2361d8]/8">
                      <Icon className="h-5 w-5 text-[#2361d8]" />
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.statusColor}`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[#011c67]">{c.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{c.body}</p>
                  {c.external ? (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
                    >
                      {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={c.href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
                    >
                      {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Why sector-first */}
      <section className="border-t border-slate-100 bg-[#f4f8ff] py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67]">
              Para un hotel, HotelGest ya es su ERP.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Para un restaurante, Revo XEF ya es su ERP. Para una clínica, Nubimed ya es su ERP. No
              necesitan adoptar Holded por separado — Isaak conecta directamente con el software que
              ya usan cada día y añade encima la capa fiscal, contable y de inteligencia de negocio.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Una API key. Listo.',
                body: 'Sin migraciones, sin formación, sin instalar nada. La API key de tu cuenta de siempre — y Isaak ya tiene todos tus datos.',
              },
              {
                title: 'Datos operativos, no contables',
                body: 'Reservas, citas, tickets de caja, RevPAR — no solo facturas. Isaak entiende tu negocio desde dentro, no desde la contabilidad.',
              },
              {
                title: 'Fiscal automático por sector',
                body: 'IVA al 10% en hostelería, exento en sanidad, retenciones en inmobiliaria. Isaak conoce las reglas de tu sector y las aplica sola.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#2361d8]/10 bg-white p-7 shadow-sm"
              >
                <h3 className="text-base font-bold text-[#011c67]">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>

          {/* Before/After table */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#2361d8]/10 bg-white shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Modelo anterior
                </p>
                <ul className="space-y-3">
                  {[
                    'Cliente tenía que adoptar Holded o Sage',
                    'Datos contables genéricos y secos',
                    'Alta fricción en el onboarding',
                    'Diferenciación baja vs. cualquier competidor',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-500">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#2361d8]/2 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#2361d8]">
                  Con Isaak sectorial
                </p>
                <ul className="space-y-3">
                  {[
                    'Cliente usa lo que ya tiene cada día',
                    'Datos operativos ricos: reservas, citas, tickets',
                    'Una API key — listo en 2 minutos',
                    'Copiloto vertical único para cada sector',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              ¿Tu sector no está en la lista?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Si tu software de gestión tiene API, podemos integrarlo. Cuéntanos qué usas.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Solicitar integración
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Ver API para developers
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
