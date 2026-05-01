import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  Code2,
  MessageSquare,
  Puzzle,
  Sparkles,
  Zap,
} from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import { getIsaakUrl } from '../lib/urls';

export const metadata: Metadata = {
  title: 'Integraciones | Verifactu Business',
  description:
    'Conectores empresariales para Holded, ChatGPT, Claude y mas. Isaak como capa de orquestacion entre tu ERP y tus canales.',
  openGraph: {
    title: 'Integraciones | Verifactu Business',
    description:
      'Conectores empresariales para Holded, ChatGPT, Claude y mas. Isaak como capa de orquestacion entre tu ERP y tus canales.',
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

const connectors = [
  {
    icon: Building2,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Holded + ChatGPT / Claude',
    body: 'El primer conector del ecosistema. Conecta tu cuenta de Holded con ChatGPT o Claude y pregunta a Isaak sobre facturas, gastos, clientes y estado contable en lenguaje natural.',
    cta: 'Ver conector Holded',
    href: 'https://holded.verifactu.business/conectores',
    external: true,
  },
  {
    icon: Bot,
    status: 'Disponible',
    statusColor: 'bg-emerald-100 text-emerald-800',
    title: 'Isaak — Asistente nativo',
    body: 'Isaak sin conector externo. Directamente en isaak.verifactu.business con historial, memoria de empresa, acciones reales sobre VeriFactu y sin limites de cuota diaria.',
    cta: 'Abrir Isaak',
    href: 'https://isaak.verifactu.business',
    external: true,
  },
  {
    icon: Code2,
    status: 'Beta',
    statusColor: 'bg-blue-100 text-blue-800',
    title: 'Isaak Platform API + MCP',
    body: 'API REST y protocolo MCP para que tu software conecte directamente con Isaak. Facturas, VeriFactu y contabilidad desde cualquier entorno con Bearer token.',
    cta: 'Ver documentacion developer',
    href: '/developers',
    external: false,
  },
  {
    icon: Puzzle,
    status: 'Proximo',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'Integraciones personalizadas',
    body: 'Conectores a medida para ERPs no soportados, bancos, ecommerce, CRM y herramientas internas. Alcance cerrado y metodologia clara.',
    cta: 'Solicitar integracion',
    href: '/contacto',
    external: false,
  },
  {
    icon: MessageSquare,
    status: 'Proximo',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'WhatsApp Business',
    body: 'Recibe alertas fiscales, responde consultas de Isaak y aprueba acciones contables desde WhatsApp sin abrir el dashboard.',
    cta: 'Apuntarse a beta',
    href: '/contacto',
    external: false,
  },
  {
    icon: Zap,
    status: 'Proximo',
    statusColor: 'bg-slate-100 text-slate-600',
    title: 'Mas conectores',
    body: 'Bancos, ecommerce (Shopify, WooCommerce), Google Drive, gestorias API y otros ERPs espanoles. El ecosistema crece segun la demanda de los usuarios.',
    cta: 'Ver hoja de ruta',
    href: '/contacto',
    external: false,
  },
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
              Conectores empresariales
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              Isaak no sustituye tu ERP. Lo entiende.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              ERPs, Holded, bancos, CRM, ecommerce, Drive, APIs y archivos empresariales dentro de
              una sola capa conversacional. Isaak como orquestador, no como sustituto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="https://holded.verifactu.business/conectores"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Ver conector Holded
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/developers"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Portal developers
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Connectors grid */}
      <section className="py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {connectors.map((c) => {
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

      {/* Custom integrations CTA */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Tu integracion no esta en la lista?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Cuéntanos tu sistema actual. Valoramos cada integracion por demanda real.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Solicitar integracion
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
