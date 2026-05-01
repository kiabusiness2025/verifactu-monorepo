import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Servicios | Verifactu Business',
  description:
    'Cumplimiento VeriFactu, modo Excel, migracion contable y soporte para autonomos, pymes y asesorias.',
  openGraph: {
    title: 'Servicios | Verifactu Business',
    description:
      'Cumplimiento VeriFactu, modo Excel, migracion contable y soporte para autonomos, pymes y asesorias.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/servicios',
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

const services = [
  {
    icon: ShieldCheck,
    badge: 'Cumplimiento',
    title: 'VeriFactu y AEAT',
    body: 'Emision y registro de facturas conforme a la Ley Antifraude. Trazabilidad, exportes AEAT y evidencia de cumplimiento sin convertir todo el producto en solo software VeriFactu.',
    cta: 'Ver suscripciones',
    href: '/suscripciones',
  },
  {
    icon: FileSpreadsheet,
    badge: 'In-house',
    title: 'Modo Excel',
    body: 'Empieza con Excels, documentos y exportaciones. Isaak ayuda a ordenar, interpretar y convertirlo en siguientes pasos sin necesitar un ERP desde el primer dia.',
    cta: 'Saber mas',
    href: '/modo-excel',
  },
  {
    icon: FileText,
    badge: 'Servicio profesional',
    title: 'Migracion contable',
    body: 'Migramos tu contabilidad a Holded u otro ERP con metodologia clara, validacion de datos y acompanamiento durante la salida. Alcance cerrado antes de ejecutar.',
    cta: 'Ver migracion',
    href: '/servicios/migracion',
  },
  {
    icon: Users,
    badge: 'Asesorias',
    title: 'Plataforma para asesorias',
    body: 'Asesorias que necesitan clientes mas ordenados y menos persecucion documental. Isaak como capa de coordinacion entre asesor y cliente.',
    cta: 'Ver para asesorias',
    href: '/asesorias',
  },
  {
    icon: Sparkles,
    badge: 'IA + ERP',
    title: 'Isaak como orquestador',
    body: 'Isaak no sustituye tu ERP. Lo convierte en algo que puedes entender, preguntar y controlar con contexto fiscal y operativo. ERPs, Holded, bancos, Drive y APIs en una sola capa conversacional.',
    cta: 'Ver integraciones',
    href: '/integraciones',
  },
];

const audiences = [
  {
    title: 'Autonomos y microempresas',
    body: 'Cumplimiento VeriFactu, control de ventas y gastos, y Isaak para no necesitar un contable para cada pregunta del dia a dia.',
  },
  {
    title: 'Pymes',
    body: 'Conecta fiscalidad, datos, ERP y operaciones. Isaak traduce los numeros en decisiones y siguientes pasos sin menus tecnicos.',
  },
  {
    title: 'Asesorias',
    body: 'Clientes mas ordenados, documentacion sin persecucion y coordinacion fluida entre asesor y empresa.',
  },
];

export default function ServiciosPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Servicios del ecosistema
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
              Todo lo que necesitas para operar con claridad.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Cumplimiento VeriFactu, modo Excel in-house, migracion contable, conectores
              empresariales e Isaak como orquestador. Para autonomos, pymes y asesorias.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/suscripciones"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Ver suscripciones
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Hablar con el equipo
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Services grid */}
      <section className="py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#2361d8]/8">
                      <Icon className="h-5 w-5 text-[#2361d8]" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {s.badge}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[#011c67]">{s.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{s.body}</p>
                  <Link
                    href={s.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
                  >
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Audience */}
      <section className="border-t border-slate-100 py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-[#011c67] sm:text-3xl">Para quien es esto</h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2361d8]" />
                  <div>
                    <p className="text-sm font-semibold text-[#011c67]">{a.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{a.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
              Empieza con lo que tienes hoy.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Sin ERP, sin contador, sin Excel perfecto. Isaak trabaja desde donde estas.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/suscripciones"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Ver planes y precios
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Hablar con el equipo
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
