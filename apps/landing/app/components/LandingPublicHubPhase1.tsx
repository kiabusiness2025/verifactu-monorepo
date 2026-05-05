import { ArrowRight, ShieldCheck, Sparkles, FileSpreadsheet, Link2 } from 'lucide-react';
import { Landmark, Building2, Users } from 'lucide-react';
import Link from 'next/link';
import Header from './Header';
import { Container, Footer, HeroTripleMock } from '../lib/home/ui';

const HOLDed_CONNECTORS_URL = 'https://holded.verifactu.business/conectores';
const ISAAK_URL = 'https://isaak.verifactu.business';

const navLinks = [
  { label: 'Precios', href: '/precios' },
  { label: 'Servicios', href: '/servicios' },
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
    body: 'ERPs, Holded, bancos, CRM, ecommerce, Drive, APIs y archivos empresariales dentro de una sola capa conversacional empresarial.',
    icon: Link2,
  },
];

const audienceCards = [
  'Autonomos y microempresas que necesitan empezar por orden y cumplimiento.',
  'Pymes que quieren conectar fiscalidad, datos, ERP y operaciones.',
  'Asesorias que necesitan clientes mas ordenados y menos persecucion documental.',
];

export default function LandingPublicHubPhase1() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Hub principal del ecosistema
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-[#011c67] sm:text-6xl sm:leading-[1.04]">
                El hub para entender, conectar y cumplir con tu empresa.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                VeriFactu es el comienzo. Isaak es la capa que conecta tu empresa.
                verifactu.business reune cumplimiento VeriFactu, conexion AEAT, modo Excel in-house,
                conectores empresariales e Isaak como orquestador inteligente para autonomos, pymes
                y asesorias.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
                >
                  Solicitar demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/recursos/contacto"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Unirme a la beta
                </Link>
                <Link
                  href="/asesorias"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Soy asesoria
                </Link>
                <a
                  href={HOLDed_CONNECTORS_URL}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Ver conectores
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <HeroTripleMock />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Arquitectura publica fase 1
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cumple, entiende y conecta tu negocio desde un unico ecosistema.
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
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Para asesorias y empresas reales
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Una plataforma para unir fiscalidad, datos, Excel, ERP y asesoria.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                No todas las empresas empiezan por una API. Algunas llegan con Excel, otras con
                Holded y otras con informacion dispersa. El ecosistema esta pensado para ordenar esa
                realidad sin forzar una migracion total desde el primer dia.
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

      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-[#011c67] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                  Primer hub vertical
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Holded es nuestro primer ecosistema conectado.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  El hub de Holded publica conectores, documentacion y piezas legales especificas
                  sin convertir Holded en el centro de todo el producto. ChatGPT y Claude son
                  canales. Isaak es la capa principal de orquestacion empresarial.
                </p>
              </div>
              <a
                href={HOLDed_CONNECTORS_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#011c67] transition hover:bg-slate-100"
              >
                Ir al hub Holded
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
