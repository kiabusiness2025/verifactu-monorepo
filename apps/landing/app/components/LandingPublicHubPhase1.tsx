import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Link2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import Header from './Header';
import { Container, Footer } from '../lib/home/ui';

const HOLDed_CONNECTORS_URL = 'https://holded.verifactu.business/conectores';
const ISAAK_URL = 'https://isaak.verifactu.business';

const navLinks = [
  { label: 'Isaak', href: ISAAK_URL },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/contacto' },
];

const pillars = [
  {
    title: 'Cumplimiento VeriFactu',
    body: 'Conexion AEAT, trazabilidad, exportables, evidencia y preparacion para Ley Antifraude sin convertir todo el producto en solo software VeriFactu.',
    icon: ShieldCheck,
  },
  {
    title: 'Isaak como orquestador',
    body: 'Isaak no sustituye tu ERP. Lo convierte en algo que puedes entender, preguntar y controlar con contexto fiscal y operativo.',
    icon: Sparkles,
  },
  {
    title: 'Modo Excel / in-house',
    body: 'Empieza con Excels, documentos, facturas y exportaciones. Isaak ayuda a ordenar, interpretar y convertirlo en siguientes pasos.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Modo conectado',
    body: 'Holded conectado hoy. Sage, A3ERP, Odoo, Xero, Cegid y más de 40 ERPs compatibles próximamente. Bancos, CRM, Drive y APIs — todo accesible desde Isaak.',
    icon: Link2,
  },
];

const audienceCards = [
  'Autónomos y microempresas que necesitan empezar por orden y cumplimiento.',
  'PYMEs que quieren conectar fiscalidad, datos y operaciones.',
  'Asesorías que necesitan clientes más ordenados y menos persecución documental.',
];

const ECOSYSTEM_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Cumplimiento VeriFactu',
    desc: 'AEAT, trazabilidad y Ley Antifraude. Registro de facturas con firma garantizada.',
    badge: null,
  },
  {
    icon: Sparkles,
    title: 'Isaak — IA empresarial',
    desc: 'Pregunta en español, obtén respuestas con datos reales. Tu empresa disponible 24/7.',
    badge: null,
  },
  {
    icon: Link2,
    title: 'Conectores ERP',
    desc: 'Holded conectado hoy. Sage, A3ERP, Odoo, Xero y +40 ERPs compatibles próximamente.',
    badge: null,
  },
  {
    icon: Landmark,
    title: 'Open Banking',
    desc: 'Movimientos bancarios en tiempo real. Conciliación automática con facturas.',
    badge: 'Próximo',
  },
];

export default function LandingPublicHubPhase1() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Verifactu Business
              </div>
              <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl sm:leading-[1.06]">
                Tu empresa, conectada. Tus impuestos, bajo control. Tu IA, siempre disponible.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                verifactu.business reúne cumplimiento AEAT, gestión empresarial con IA e integración
                con tu ERP en un solo ecosistema. Empieza gratis hoy.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  IA incluida desde el plan gratuito
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Holded conectado hoy
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={ISAAK_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
                >
                  Empezar gratis
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Solicitar demo
                </Link>
                <Link
                  href="/asesorias"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Soy asesoría
                </Link>
              </div>
            </div>

            {/* Right: Ecosystem cards */}
            <div className="space-y-3">
              {ECOSYSTEM_CARDS.map(({ icon: Icon, title, desc, badge }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#2361d8]/20 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2361d8]/10 text-[#2361d8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#011c67]">{title}</span>
                      {badge && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm leading-6 text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Disponible hoy · Plan gratuito
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-emerald-600">
                  Sin tarjeta · Listo en 2 minutos · +40 ERPs conectados
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── PILARES ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Cuatro pilares del ecosistema
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cumple, entiende y conecta tu negocio desde un único ecosistema.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.body}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/conectores"
              className="text-sm font-semibold text-[#2361d8] hover:underline"
            >
              Ver todos los conectores disponibles →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── PARA QUIÉN ───────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Para asesorías y empresas reales
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Una plataforma para unir fiscalidad, datos, Excel, ERP y asesoría.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                No todas las empresas empiezan por una integración. Algunas llegan con Excel, otras
                con Holded y otras con información dispersa. La plataforma está pensada para ordenar
                esa realidad sin forzar una migración total desde el primer día.
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                  <Landmark className="h-5 w-5 text-[#2361d8]" />
                  Isaak como capa conversacional empresarial
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Isaak ayuda a entender y operar el negocio. No es otro ERP y no es otro software
                  de facturacion. Es una capa conversacional empresarial para conectar herramientas
                  existentes y hacerlas comprensibles.
                </p>
                <a
                  href={ISAAK_URL}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:underline"
                >
                  Ver Isaak como orquestador
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {audienceCards.map((copy, index) => (
                <article
                  key={copy}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                    {index === 0 ? (
                      <Building2 className="h-5 w-5" />
                    ) : index === 1 ? (
                      <Link2 className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── HOLDED CTA ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-[#011c67] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                  Conector ERP disponible hoy
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  ¿Usas Holded? Conecta en 2 minutos.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  Isaak lee tu empresa directamente desde Holded: facturas, clientes, contabilidad y
                  proyectos. Pregunta en español, obtén respuestas con datos reales. Sage, A3ERP,
                  Odoo, Xero y más ERPs compatibles próximamente.
                </p>
              </div>
              <a
                href={HOLDed_CONNECTORS_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] transition hover:bg-slate-100"
              >
                Conectar Holded
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
