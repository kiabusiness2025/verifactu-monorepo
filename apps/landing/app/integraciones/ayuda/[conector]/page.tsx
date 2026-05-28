import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Info,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import Header from '../../../components/Header';
import { Container, Footer } from '../../../lib/home/ui';
import { getIsaakUrl } from '../../../lib/urls';
import { getAllSlugs, getConnectorHelp } from './connector-help-data';

const navLinks = [
  { label: 'Integraciones', href: '/integraciones' },
  { label: 'Suscripciones', href: '/suscripciones' },
  { label: 'Contacto', href: '/contacto' },
];

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ conector: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conector: string }>;
}): Promise<Metadata> {
  const { conector } = await params;
  const data = getConnectorHelp(conector);
  if (!data) return { title: 'Integración no encontrada | Isaak' };
  return {
    title: `Cómo conectar ${data.name} con Isaak | Verifactu Business`,
    description: data.description,
    openGraph: {
      title: `Cómo conectar ${data.name} con Isaak`,
      description: data.description,
      type: 'website',
      locale: 'es_ES',
      url: `https://verifactu.business/integraciones/ayuda/${data.slug}`,
      siteName: 'Verifactu Business',
    },
  };
}

export default async function ConnectorHelpPage({
  params,
}: {
  params: Promise<{ conector: string }>;
}) {
  const { conector } = await params;
  const data = getConnectorHelp(conector);
  if (!data) notFound();

  const isaakUrl = getIsaakUrl();
  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      {/* Breadcrumb + Hero */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_80%)] py-12 sm:py-16">
        <Container>
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/integraciones" className="hover:text-[#2361d8]">
              Integraciones
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/integraciones" className="hover:text-[#2361d8]">
              Ayuda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-800">{data.name}</span>
          </nav>

          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2361d8]/10">
              <Icon className="h-7 w-7 text-[#2361d8]" />
            </div>
            <div>
              <span className="mb-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                {data.sector}
              </span>
              <h1 className="text-2xl font-bold text-[#011c67] sm:text-3xl">
                Cómo conectar {data.name} con Isaak
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{data.tagline}</p>
            </div>
          </div>

          {/* Auth type pill */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#2361d8]/20 bg-white px-4 py-2.5 shadow-sm">
            <Info className="h-4 w-4 shrink-0 text-[#2361d8]" />
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-[#011c67]">Autenticación: </span>
              {data.authLabel}
            </p>
          </div>
        </Container>
      </section>

      {/* Setup steps */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mb-8 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#2361d8]" />
            <h2 className="text-xl font-bold text-[#011c67]">Configuración paso a paso</h2>
          </div>

          <div className="space-y-4">
            {data.setupSteps.map((s) => (
              <div
                key={s.step}
                className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-sm font-bold text-white">
                  {s.step}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#011c67]">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{s.body}</p>
                  {s.note && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs leading-5 text-amber-800">{s.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA inline */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={`${isaakUrl}/integrations`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
            >
              Abrir Integraciones en Isaak
              <ArrowRight className="h-4 w-4" />
            </a>
            {data.officialDocs && (
              <a
                href={data.officialDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#2361d8]"
              >
                Documentación oficial de {data.name}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </Container>
      </section>

      {/* Synced data */}
      <section className="border-t border-slate-100 bg-slate-50 py-12 sm:py-16">
        <Container>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#011c67]">
              Qué datos sincroniza Isaak desde {data.name}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Una vez conectado, Isaak obtiene estos datos en tiempo real para responder tus
              consultas y generar alertas proactivas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.syncedItems.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-[#011c67]">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      {data.faq.length > 0 && (
        <section className="border-t border-slate-100 py-12 sm:py-16">
          <Container>
            <div className="mb-8 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#2361d8]" />
              <h2 className="text-xl font-bold text-[#011c67]">Preguntas frecuentes</h2>
            </div>

            <div className="max-w-3xl space-y-4">
              {data.faq.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-bold text-[#011c67]">{item.q}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* CTA footer */}
      <section className="border-t border-slate-100 bg-[#f4f8ff] py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-[#011c67]">¿Listo para conectar {data.name}?</h2>
            <p className="mt-3 text-base text-slate-600">
              Abre Isaak, ve a Integraciones y sigue los pasos de arriba. Menos de 2 minutos.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={`${isaakUrl}/integrations`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
              >
                Ir a Integraciones en Isaak
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/integraciones"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#2361d8]"
              >
                ← Ver todas las integraciones
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-400">
              ¿Tienes dudas?{' '}
              <Link href="/contacto" className="underline hover:text-[#2361d8]">
                Contacta con soporte
              </Link>{' '}
              o escríbenos a{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="underline hover:text-[#2361d8]"
              >
                soporte@verifactu.business
              </a>
            </p>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
