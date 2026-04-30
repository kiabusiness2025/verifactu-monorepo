import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';

export const metadata: Metadata = {
  title: 'Conectores | Verifactu Business',
  description:
    'Conectores empresariales y hubs verticales del ecosistema Verifactu Business. Empezamos por Holded como primer ecosistema conectado.',
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Isaak', href: '/que-es-isaak' },
  { label: 'Modo Excel', href: '/modo-excel' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Asesorias', href: '/asesorias' },
  { label: 'Contacto', href: '/recursos/contacto' },
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
              Holded es nuestro primer ecosistema conectado.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              ChatGPT y Claude son los primeros canales. Isaak es la capa principal de orquestacion
              empresarial. El hub vertical de Holded vive en un dominio publico separado para no
              mezclar producto general con el flujo minimo del conector.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Hub vertical actual</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              En Fase 1 publica, el hub de Holded concentra conectores, documentacion, privacidad,
              DPA y estados beta sin tocar rutas de OAuth, MCP o review externa ya enviadas.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://holded.verifactu.business/conectores"
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
              >
                Ver hub Holded
              </a>
              <Link
                href="/recursos/contacto"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Solicitar acceso beta
              </Link>
            </div>
          </div>
        </Container>
      </section>
      <Footer />
    </div>
  );
}
