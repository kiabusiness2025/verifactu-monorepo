import { ArrowRight, CheckCircle2, Database, Link2, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Conectores | Verifactu Business',
  description:
    'Holded conectado directamente. Sage, A3ERP, Odoo, Xero, Cegid, QuickBooks y +40 ERPs más via Chift. Isaak como capa de orquestación empresarial.',
};

const ISAAK_URL = 'https://isaak.verifactu.business';

const navLinks = [
  { label: 'Isaak', href: ISAAK_URL },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/contacto' },
];

const CONNECTORS = [
  {
    name: 'Holded',
    tag: 'Conexión directa · Disponible',
    status: 'live' as const,
    icon: Database,
    desc: 'Isaak lee ventas, gastos, cobros, facturas, CRM y proyectos de Holded en tiempo real. Sin exportar, sin copiar: pregunta en español y obtén respuestas con tus datos.',
    features: [
      'Facturas, cobros y pagos en tiempo real',
      'Contabilidad explicada sin tecnicismos',
      'CRM, contactos y agenda comercial',
      'Proyectos y tareas desde Holded',
    ],
    href: 'https://holded.verifactu.business',
    cta: 'Ver hub Holded',
  },
  {
    name: 'Chift — +40 ERPs',
    tag: 'Sage · A3ERP · Odoo · Xero · Cegid · QuickBooks · Próximamente',
    status: 'soon' as const,
    icon: Link2,
    desc: 'Una sola integración universal que conecta Isaak con más de 40 sistemas contables y ERP del mercado español y europeo. Cambia de ERP cuando quieras — Isaak no cambia.',
    features: [
      'Sage 200 ES y A3ERP',
      'Odoo, Xero, Cegid, QuickBooks',
      'Pennylane y +35 ERPs adicionales',
      'Misma experiencia Isaak en todos',
    ],
    href: '/recursos/contacto',
    cta: 'Unirme a la lista',
  },
];

export default function ConnectorsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_75%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Conectores empresariales
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              El ERP que ya usas, conectado a Isaak.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Holded funciona hoy. Sage, A3ERP, Odoo, Xero y más de 40 ERPs llegan vía Chift. Isaak
              es la capa de orquestación: el ERP cambia, la experiencia permanece.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            {CONNECTORS.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.name}
                  className={`rounded-[2rem] border p-8 shadow-sm ${
                    c.status === 'live'
                      ? 'border-[#2361d8]/20 bg-[#2361d8]/3'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#011c67]">{c.name}</h2>
                        <p className="text-xs text-slate-500">{c.tag}</p>
                      </div>
                    </div>
                    {c.status === 'live' ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        ✓ Disponible
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                        Próximamente
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-600">{c.desc}</p>

                  <ul className="mt-5 space-y-2">
                    {c.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7">
                    <a
                      href={c.href}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
                        c.status === 'live'
                          ? 'bg-[#2361d8] text-white hover:bg-[#1f55c0]'
                          : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {c.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/70 py-14">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#011c67]">
                  Isaak como capa de orquestación
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Los conectores no son el producto. Son la puerta de entrada. Isaak conecta tu ERP,
                  tu banca, tus documentos y tu equipo en una sola capa conversacional: pregunta en
                  español, obtén respuestas con datos reales de tu empresa.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={ISAAK_URL}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
                  >
                    Abrir Isaak
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/recursos/contacto"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Hablar con el equipo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
