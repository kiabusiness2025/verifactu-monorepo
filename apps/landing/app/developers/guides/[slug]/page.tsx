import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../../components/Header';
import { Container, Footer } from '../../../lib/home/ui';
import { GUIDES, getGuide, type GuideStep } from '../guides-data';

const navLinks = [
  { label: 'VeriFactu', href: '/verifactu/que-es' },
  { label: 'Que es Isaak', href: '/que-es-isaak' },
  { label: 'Conectores', href: '/conectores' },
  { label: 'Precios', href: '/precios' },
  { label: 'Developers', href: '/developers' },
];

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) {
    return { title: 'Guía no encontrada | Isaak Developers' };
  }
  return {
    title: `${guide.title} | Isaak Developers — Verifactu Business`,
    description: guide.summary,
    alternates: { canonical: `/developers/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      type: 'article',
      locale: 'es_ES',
      url: `https://verifactu.business/developers/guides/${guide.slug}`,
      siteName: 'Verifactu Business',
    },
  };
}

// Colores por kind para los callouts inline en los pasos.
const CALLOUT_STYLES = {
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-900',
    Icon: Info,
    iconClass: 'text-sky-600',
  },
  warn: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    Icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    Icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
} as const;

function StepBlock({ step, index }: { step: GuideStep; index: number }) {
  return (
    <article
      id={`paso-${index + 1}`}
      className="scroll-mt-24 border-t border-slate-100 py-10 first:border-t-0 first:pt-0"
    >
      <h2 className="text-xl font-bold text-[#011c67] sm:text-2xl">{step.title}</h2>
      <p className="mt-3 text-slate-600 leading-7">{step.body}</p>

      {step.callout && (
        <div
          className={`mt-5 flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6 ${CALLOUT_STYLES[step.callout.kind].wrap}`}
        >
          {(() => {
            const Icon = CALLOUT_STYLES[step.callout.kind].Icon;
            return (
              <Icon
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${CALLOUT_STYLES[step.callout.kind].iconClass}`}
              />
            );
          })()}
          <span>{step.callout.text}</span>
        </div>
      )}

      {step.code?.map((block, i) => (
        <div key={i} className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-800 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 text-xs font-medium text-slate-400">
              {block.label ?? block.language}
            </span>
          </div>
          <pre className="overflow-x-auto bg-slate-900 p-5 text-sm leading-7 text-slate-200">
            <code>{block.content}</code>
          </pre>
        </div>
      ))}
    </article>
  );
}

export default async function GuideDetailPage({ params }: Params) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const Icon = guide.icon;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_70%)] py-12 sm:py-14">
        <Container>
          <Link
            href="/developers/guides"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#2361d8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Guías
          </Link>

          <div className="mt-5 flex items-start gap-4">
            <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2361d8]/8">
              <Icon className="h-6 w-6 text-[#2361d8]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                {guide.eyebrow}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
                {guide.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{guide.summary}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                <Clock className="h-3 w-3" />
                {guide.readingMinutes} min de lectura
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_220px]">
            <div className="min-w-0">
              {/* Prerrequisitos */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Antes de empezar
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {guide.prerequisites.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pasos */}
              <div className="mt-10">
                {guide.steps.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>

              {/* Next steps */}
              <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-6">
                <h2 className="text-lg font-semibold text-[#011c67]">¿Y ahora qué?</h2>
                <ul className="mt-4 space-y-2.5">
                  {guide.nextSteps.map((s) => (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#2361d8] hover:underline"
                      >
                        {s.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ToC sticky */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  En esta guía
                </h2>
                <ol className="mt-3 space-y-2 text-sm">
                  {guide.steps.map((step, i) => (
                    <li key={i}>
                      <a
                        href={`#paso-${i + 1}`}
                        className="block text-slate-600 hover:text-[#2361d8]"
                      >
                        {step.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
