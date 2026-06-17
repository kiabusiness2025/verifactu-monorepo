'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Globe,
  Handshake,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const STATS = [
  { label: 'Modelos AEAT soportados', value: '12+' },
  { label: 'Integraciones ERP / bancarias', value: '20+' },
  { label: 'Canales de chat (web, Telegram, WhatsApp)', value: '3' },
  { label: 'Mercado objetivo España', value: '3.5M PYMEs' },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: 'IA fiscal nativa',
    body: 'Claude y GPT-4o integrados para consultas tributarias, modelos AEAT, VeriFactu y contabilidad en tiempo real.',
  },
  {
    icon: Globe,
    title: 'Ecosistema conectado',
    body: 'Holded, PrestaShop, Revo, Mindbody, Open Banking (Salt Edge, GoCardless), Google Workspace y Microsoft 365.',
  },
  {
    icon: BarChart3,
    title: 'Ingresos recurrentes',
    body: 'Modelo SaaS mensual/anual. Free tier de captación. Conversión a Pro con 14 días de trial sin tarjeta.',
  },
  {
    icon: TrendingUp,
    title: 'Escalabilidad',
    body: 'Arquitectura multi-tenant sobre Next.js + Prisma Postgres. Desplegado en Vercel con serverless auto-scaling.',
  },
  {
    icon: Building2,
    title: 'Cumplimiento regulatorio',
    body: 'VeriFactu (Ley Antifraude), SII, AEAT Sede Electrónica. Isaak es el primer asistente fiscal IA certificado para PYMEs españolas.',
  },
  {
    icon: Users,
    title: 'Modelo de asesoría',
    body: 'Modo Asesoría: gestiona múltiples clientes desde un único panel. Caso de uso B2B2C con retención alta.',
  },
];

type Step = 'form' | 'success';

export default function InvestorsPage() {
  const [step, setStep] = useState<Step>('form');
  const [type, setType] = useState<'investor' | 'partner'>('investor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      company: fd.get('company') as string,
      role: fd.get('role') as string,
      type,
      message: fd.get('message') as string,
      consent: fd.get('consent') === 'on',
    };

    try {
      const res = await fetch('/api/investors/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const msgs: Record<string, string> = {
          name_required: 'El nombre es obligatorio (mínimo 2 caracteres).',
          email_invalid: 'Introduce un email válido.',
          company_required: 'La empresa es obligatoria.',
          consent_required: 'Debes aceptar la política de privacidad.',
        };
        setError(msgs[data.error ?? ''] ?? 'Error al enviar. Inténtalo de nuevo.');
        return;
      }

      // Trigger download
      const a = document.createElement('a');
      a.href = '/investors/Isaak_Strategic_Teaser_2026.pdf';
      a.download = 'Isaak_Strategic_Teaser_2026.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStep('success');
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ── Hero ── */}
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_72%)] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Sparkles className="h-3.5 w-3.5" />
            Inversores &amp; Partners
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
            La IA que gestiona el negocio
            <br />
            de cada PYME española.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Isaak combina IA generativa con cumplimiento fiscal nativo — VeriFactu, AEAT, Open
            Banking y ERPs en una sola plataforma SaaS.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              <Download className="h-4 w-4" />
              Descargar presentación
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver planes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-slate-100 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-center"
              >
                <dd className="text-3xl font-bold tracking-tight text-[#011c67]">{s.value}</dd>
                <dt className="mt-1 text-xs text-slate-500">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
              Por qué Isaak
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Una plataforma. Toda la operativa fiscal de una PYME.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <article
                  key={h.title}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/8 text-[#2361d8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#011c67]">{h.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{h.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Gated download form ── */}
      <section
        id="contacto"
        className="border-y border-slate-200 bg-[linear-gradient(180deg,#f0f5ff_0%,#ffffff_100%)] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-2xl px-4">
          {step === 'success' ? (
            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-10 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-5 text-2xl font-bold text-emerald-900">
                ¡Gracias! La descarga ha comenzado.
              </h2>
              <p className="mt-3 text-sm leading-7 text-emerald-800">
                Te hemos enviado la presentación estratégica de Isaak. Si no se descargó
                automáticamente,{' '}
                <a
                  href="/investors/Isaak_Strategic_Teaser_2026.pdf"
                  download
                  className="font-semibold underline"
                >
                  haz clic aquí
                </a>
                .
              </p>
              <p className="mt-4 text-xs text-emerald-700">
                Nos pondremos en contacto contigo en las próximas 48 h.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Volver al inicio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                  <FileText className="h-3.5 w-3.5" />
                  Presentación estratégica 2026
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67]">
                  Descarga el dossier de Isaak
                </h2>
                <p className="mt-3 text-base text-slate-600">
                  Deja tus datos y descarga el teaser estratégico al instante.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3 w-3" />
                  Información confidencial · uso exclusivo inversor / partner
                </div>
              </div>

              {/* Type selector */}
              <div className="mb-6 flex gap-3">
                {(['investor', 'partner'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                      type === t
                        ? 'border-[#2361d8] bg-[#2361d8] text-white'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'investor' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <Handshake className="h-4 w-4" />
                    )}
                    {t === 'investor' ? 'Soy inversor' : 'Soy partner / distribuidor'}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-xs font-semibold text-slate-700">
                      Nombre completo *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Ana Martínez"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                      Email corporativo *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="ana@fondo.com"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="company" className="text-xs font-semibold text-slate-700">
                      Empresa / Fondo *
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      autoComplete="organization"
                      placeholder="Acme Capital"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="role" className="text-xs font-semibold text-slate-700">
                      Cargo
                    </label>
                    <input
                      id="role"
                      name="role"
                      type="text"
                      autoComplete="organization-title"
                      placeholder="Partner, CFO, Business Dev…"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-slate-700">
                    Mensaje (opcional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder="¿Hay algo concreto que te interese explorar?"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20 resize-none"
                  />
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    required
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#2361d8]"
                  />
                  <label htmlFor="consent" className="text-xs leading-5 text-slate-600">
                    Acepto la{' '}
                    <Link href="/privacy" className="font-semibold text-[#2361d8] hover:underline">
                      política de privacidad
                    </Link>{' '}
                    y que Isaak / KIA Business S.L. contacte conmigo con información relacionada con
                    esta solicitud.
                  </label>
                </div>

                {error && (
                  <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Descargar presentación
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-slate-500">
            ¿Prefieres una llamada directa?{' '}
            <a
              href="mailto:soporte@verifactu.business"
              className="font-semibold text-[#2361d8] hover:underline"
            >
              soporte@verifactu.business
            </a>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            KIA Business S.L. &middot; CIF B-12345678 &middot; © {new Date().getFullYear()} Isaak
          </p>
        </div>
      </section>
    </main>
  );
}
