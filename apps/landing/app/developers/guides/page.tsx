import { ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/Header';
import { Container, Footer } from '../../lib/home/ui';
import { GUIDES } from './guides-data';

export const metadata: Metadata = {
  title: 'Guías paso a paso | Isaak Platform API — Verifactu Business',
  description:
    'Tutoriales prácticos con código real: primera factura via API, webhooks con HMAC, conectar Holded y configurar el conector MCP en Claude Desktop.',
  alternates: { canonical: '/developers/guides' },
  openGraph: {
    title: 'Guías paso a paso — Isaak Developers',
    description:
      'Tutoriales prácticos con código real para integrar Isaak en tu software.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/developers/guides',
    siteName: 'Verifactu Business',
  },
};

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-14 sm:py-16">
        <Container>
          <Link
            href="/developers"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#2361d8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Developers
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <BookOpen className="h-3.5 w-3.5" />
            Guías paso a paso
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            Aprende integrando, no leyendo.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Cada guía es un tutorial completo con código que copias y pegas. Desde la primera
            factura via cURL hasta firmar webhooks en producción.
          </p>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {GUIDES.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.slug}
                  href={`/developers/guides/${guide.slug}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#2361d8]/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/8">
                      <Icon className="h-5 w-5 text-[#2361d8]" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Clock className="h-3 w-3" />
                      {guide.readingMinutes} min
                    </span>
                  </div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                    {guide.eyebrow}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-[#011c67]">{guide.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{guide.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] group-hover:underline">
                    Abrir guía <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-100 py-14">
        <Container>
          <div className="rounded-[2rem] border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-10 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight text-[#011c67] sm:text-3xl">
              ¿Te falta una guía?
            </h2>
            <p className="mt-3 text-slate-600">
              Si estás integrando algo que no encuentras aquí, dínoslo y lo escribimos.
            </p>
            <Link
              href="/recursos/contacto"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
            >
              Proponer una guía
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
