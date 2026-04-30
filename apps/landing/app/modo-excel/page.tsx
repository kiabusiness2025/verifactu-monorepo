import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Modo Excel | Verifactu Business',
  description:
    'Empieza con Excel, documentos y exportaciones antes de conectar todos tus sistemas. Isaak puede trabajar en modo in-house sin exigir un ERP profundo desde el primer dia.',
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Isaak', href: '/que-es-isaak' },
  { label: 'Modo Excel', href: '/modo-excel' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Asesorias', href: '/asesorias' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const useCases = [
  'Subir o importar Excel y exportaciones existentes.',
  'Revisar estructura y detectar faltantes antes del cierre.',
  'Preparar resumen fiscal y operativo para el negocio o la asesoria.',
  'Cruzar facturas, gastos y documentos sin exigir API desde el primer dia.',
  'Generar checklists y dejar la conexion futura preparada.',
];

export default function ExcelModePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_75%)] py-16 sm:py-20">
        <Container>
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Modo Excel / in-house
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Empieza con Excel. Escala con conectores.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              No todas las empresas estan preparadas para conectar todos sus sistemas desde el
              primer dia. Por eso Isaak tambien trabaja en modo in-house: Excel, documentos,
              exportaciones, facturas y archivos.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">Para quien es</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li>Autonomos y microempresas que operan con hojas de calculo.</li>
                <li>Pymes que trabajan con exportaciones y documentos internos.</li>
                <li>Asesorias con clientes desordenados o sin integracion API.</li>
                <li>Equipos que quieren ordenar primero y conectar despues.</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">Que permite hoy</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-slate-500">
                Algunas capacidades profundas pueden estar en desarrollo o disponibles en beta
                privada segun el caso y el flujo de activacion.
              </p>
            </article>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              Empezar con Excel
            </Link>
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Solicitar demo
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
