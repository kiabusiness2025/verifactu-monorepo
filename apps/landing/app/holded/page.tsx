import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Bot, BriefcaseBusiness, Building2, CheckCircle2, FileSpreadsheet, MessageSquareText, Sparkles } from 'lucide-react';
import { getAppUrl } from '../lib/urls';

export const metadata: Metadata = {
  title: 'Isaak for Holded | Conecta Holded con ChatGPT gratis',
  description:
    'Conecta Holded con ChatGPT gratis con Isaak. Consulta facturas, contactos, cuentas, CRM y proyectos en lenguaje natural, y da el salto a verifactu.business cuando quieras la experiencia completa.',
};

const campaignPoints = [
  'Gratis para usuarios de Holded en esta fase de lanzamiento.',
  'Conecta tu API key de Holded en minutos.',
  'Consulta facturas, contactos, cuentas, CRM y proyectos desde ChatGPT.',
  'CTA permanente a verifactu.business para la experiencia fiscal y operativa completa.',
];

const useCases = [
  {
    title: 'Facturas sin menús complejos',
    body: 'Pregunta por ventas, pendientes, borradores y actividad reciente sin navegar pantallas técnicas.',
    icon: FileSpreadsheet,
  },
  {
    title: 'CRM con contexto real',
    body: 'Cruza contactos, bookings y seguimiento comercial con el estado financiero del negocio.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Proyectos explicados',
    body: 'Resume proyectos y tareas en lenguaje claro para saber qué se mueve y qué se está desviando.',
    icon: Building2,
  },
];

export default function HoldedCampaignPage() {
  const appUrl = getAppUrl();
  const chatgptAppUrl = process.env.NEXT_PUBLIC_HOLDED_CHATGPT_APP_URL || 'https://chatgpt.com/apps/isaak-for-holded-beta/asdk_app_69b9aa407b008191a102a76216fc4842';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_40%,#ffffff_100%)] text-slate-900">
      <section className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            verifactu.business
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            <Sparkles className="h-3.5 w-3.5" />
            Holded + ChatGPT
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
              <Bot className="h-3.5 w-3.5 text-[#ff5460]" />
              Isaak for Holded
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Conecta Holded con ChatGPT gratis y habla con tu negocio en lenguaje natural.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Isaak es el asistente fiscal-contable que vive en Verifactu y opera sobre tus datos de Holded. Empieza en ChatGPT en minutos y, si quieres panel visual, reglas fiscales e histórico, da el salto a verifactu.business con prueba gratis de 30 días.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#ef4654]"
              >
                Abrir Isaak for Holded en ChatGPT
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://verifactu.business"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Probar verifactu.business 30 días
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {campaignPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{point}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(255,84,96,0.35)]">
            <div className="flex items-center justify-center rounded-[1.5rem] border border-slate-200 bg-[#fff7f7] p-10">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                width={220}
                height={220}
                className="h-28 w-28 sm:h-36 sm:w-36"
                priority
              />
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Lo que ya puede hacer Isaak hoy</div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Resume ingresos, pendientes y señales de riesgo.</div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Busca contactos y prepara borradores antes de emitir.</div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Explica cuentas, CRM y proyectos sin lenguaje contable.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Primer paso: ChatGPT. Siguiente paso: experiencia completa de Verifactu.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Diseñamos Isaak for Holded como puerta de entrada: rápido, gratuito y conversacional. Si necesitas más control, verifactu.business añade panel visual, histórico, automatizaciones, trazabilidad y una capa fiscal completa.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_100%)] p-8 text-white shadow-sm lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                  Experiencia completa
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  ¿Quieres a Isaak también dentro de verifactu.business?
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Da el salto a la versión completa con prueba gratis durante 30 días: panel visual, histórico, reglas fiscales, sincronización y apoyo diario para empresarios que no quieren perderse entre números.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  href="https://verifactu.business"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#011c67] hover:bg-slate-100"
                >
                  Empezar prueba gratis de 30 días
                </Link>
                <Link
                  href={`${appUrl}/dashboard/integrations/isaak-for-holded`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver módulo en la app
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-10">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-1 h-5 w-5 shrink-0 text-[#ff5460]" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Próximo paso: demo real en vídeo
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  Aquí colocaremos el vídeo de Isaak trabajando con datos de muestra de Holded. Mientras tanto, estamos preparando un tenant demo limpio para que la grabación enseñe contactos, facturas, borradores, proyectos y conversaciones reales con Isaak.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
