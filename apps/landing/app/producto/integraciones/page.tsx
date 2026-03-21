import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Plug,
  Radar,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';
import { getAppUrl } from '../../lib/urls';

export const metadata: Metadata = {
  title: 'Integraciones compatibles | Verifactu Business',
  description:
    'Descubre las integraciones y compatibilidades de Isaak dentro de verifactu.business. Holded es la primera puerta de entrada pública y llegarán más conectores.',
};

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Qué es Isaak', href: '/que-es-isaak' },
  { label: 'Holded', href: '/holded' },
  { label: 'Planes', href: '/planes' },
  { label: 'Integraciones', href: '/producto/integraciones' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const pillars = [
  {
    title: 'Una sola experiencia de Isaak',
    description:
      'Queremos que Isaak mantenga la misma lógica de control, claridad y siguiente paso aunque cambie la fuente de datos.',
    icon: Bot,
  },
  {
    title: 'Integraciones con criterio',
    description:
      'No añadimos conectores por volumen. Priorizamos los que aportan valor fiscal, operativo y documental real.',
    icon: Workflow,
  },
  {
    title: 'Datos reales, menos fricción',
    description:
      'La conexión es un medio. El objetivo es que Isaak pueda priorizar, explicar y ayudarte a decidir mejor.',
    icon: Radar,
  },
];

const activeIntegrations = [
  {
    title: 'Holded',
    description: 'Primera compatibilidad pública para activar Isaak con datos reales de ERP.',
    icon: Plug,
    status: 'Disponible ahora',
    href: '/holded',
    cta: 'Ver landing de Holded',
  },
];

const upcomingIntegrations = [
  {
    title: 'Nuevos ERPs compatibles',
    description: 'Estamos preparando más entradas para facturas, gastos, clientes y operativa.',
  },
  {
    title: 'Documentos y storage compartido',
    description:
      'La capa documental de Isaak crecerá para trabajar con archivos y contexto persistente.',
  },
  {
    title: 'Fuentes conectadas por tenant',
    description:
      'La arquitectura está pensada para conectar varias fuentes sin romper la identidad del producto.',
  },
];

export default function IntegracionesPage() {
  const appUrl = getAppUrl();
  const isaakChatUrl = `${appUrl}/dashboard?isaak=1`;

  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <Header navLinks={navLinks} />

      <section className="py-16">
        <Container>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <Plug className="h-4 w-4 text-[#2361d8]" />
              Ecosistema de integraciones
            </div>
            <h1 className="mt-4 text-4xl font-bold text-[#011c67] sm:text-5xl">
              Integraciones compatibles para que Isaak trabaje con datos reales.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Holded es la primera puerta pública de entrada, pero no será la única. La marca
              protagonista es Isaak dentro de verifactu.business: las integraciones existen para
              darle contexto y capacidad operativa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
              >
                Activar Isaak 30 días
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/holded"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Explorar compatibilidad con Holded
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12">
        <Container>
          <div className="grid gap-8 lg:grid-cols-3">
            {pillars.map((item) => (
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
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="mb-8 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#eef4ff_100%)] p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                  Disponible ahora
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-[#011c67] sm:text-3xl">
                  Holded es la primera compatibilidad pública de Isaak
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Lo tratamos como ERP compatible y fuente de datos, no como marca protagonista.
                  Sirve para activar a Isaak con datos reales y empezar a trabajar sin depender
                  todavía de la experiencia completa.
                </p>
              </div>
              <div>
                <Link
                  href="/holded"
                  className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-5 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
                >
                  Ver compatibilidad Holded
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            {activeIntegrations.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {item.status}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#011c67]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#1f55c0]"
                >
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
            {upcomingIntegrations.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                  <Clock3 className="h-3.5 w-3.5" />
                  Próximamente
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-[#2361d8]/15 bg-white p-10">
            <h2 className="text-2xl font-semibold text-[#011c67]">
              Necesitas una integración específica
            </h2>
            <p className="mt-4 text-slate-600">
              Cuéntanos tu caso y preparamos un plan con integraciones, almacenamiento documental y
              soporte a medida para tu flujo real.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Conexión segura por API key o credenciales server-side.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Capa documental y memoria de Isaak pensada para continuidad real.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Acompañamiento en implantación, migración y soporte operativo.
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
        </Container>
      </section>

      <section className="bg-white py-12">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#ffffff_100%)] p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/15">
                  <ShieldCheck className="h-4 w-4" />
                  Arquitectura de marca
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-[#011c67] sm:text-3xl">
                  La regla es simple: la integración abre la puerta, pero la experiencia la firma
                  Isaak.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Este hub será la mejor puerta pública para futuras landings: aquí mostraremos
                  compatibilidades activas, próximas integraciones y casos especiales sin fragmentar
                  la marca principal de verifactu.business.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/holded"
                  className="inline-flex items-center justify-center rounded-xl border border-[#ff5460] px-5 py-3 text-sm font-semibold text-[#ff5460] hover:bg-[#ff5460]/10"
                >
                  Ver Holded
                </Link>
                <Link
                  href={isaakChatUrl}
                  className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                >
                  Entrar con Isaak
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
