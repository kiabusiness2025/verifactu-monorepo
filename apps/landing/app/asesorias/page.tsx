import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Asesorias | Verifactu Business',
  description:
    'Clientes mas ordenados, cierres mas claros y menos persecucion documental. Isaak ayuda a asesorias a preparar informacion fiscal y operativa con mejor trazabilidad.',
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Isaak', href: '/que-es-isaak' },
  { label: 'Modo Excel', href: '/modo-excel' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Asesorias', href: '/asesorias' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const advisorPoints = [
  'Clientes con Excel, documentos y facturacion dispersa.',
  'Clientes con Holded y otros sistemas que necesitan llegar mas ordenados.',
  'Preparacion VeriFactu, resumen fiscal y trazabilidad documental.',
  'Checklists, proximos pasos y menos persecucion documental antes del cierre.',
  'Panel futuro multiempresa y flujos mas estructurados en siguientes fases.',
];

export default function AdvisorPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_75%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Asesorias
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Clientes mas ordenados, cierres mas claros y menos persecucion documental.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Isaak ayuda a convertir datos dispersos en resumentes, alertas y proximos pasos para
              la asesoria. El objetivo es llegar al cierre con mejor contexto y menos friccion
              operativa.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">Que resuelve</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {advisorPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">Posicionamiento</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                Isaak no sustituye a la asesoria. Ayuda a que el cliente llegue mas preparado, con
                menos huecos documentales y con una mejor traduccion de lo fiscal a lenguaje
                empresarial.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                La asesorias pueden empezar con clientes en modo Excel o con clientes ya conectados
                a Holded. La arquitectura publica mantiene ambos caminos sin romper los flujos del
                conector actual.
              </p>
            </article>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              Solicitar piloto para asesorias
            </Link>
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Quiero probar con mis clientes
            </Link>
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hablar con el equipo
            </Link>
          </div>
        </Container>
      </section>
      <Footer />
    </div>
  );
}
