import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAppUrl } from '../lib/urls';

export const metadata: Metadata = {
  title: 'Isaak con Holded como entrada compatible | verifactu.business',
  description:
    'Activa Isaak con datos reales y usa Holded como fuente compatible de entrada. La experiencia principal sigue siendo Isaak dentro de verifactu.business.',
  icons: {
    icon: [{ url: '/Isaak/isaak-avatar.png', type: 'image/png' }],
    shortcut: ['/Isaak/isaak-avatar.png'],
    apple: [{ url: '/Isaak/isaak-avatar.png', type: 'image/png' }],
  },
};

const benefitCards = [
  {
    title: 'Control antes que ruido',
    body: 'Isaak resume lo importante y te ayuda a priorizar facturas, cobros, gastos y plazos sin perderte en pantallas tecnicas.',
    icon: Wallet,
  },
  {
    title: 'Automatizacion con criterio',
    body: 'No se limita a responder. Te acompaña con borradores, alertas, revisiones y siguientes pasos sobre datos reales.',
    icon: Workflow,
  },
  {
    title: 'Menos errores, mas tranquilidad',
    body: 'Isaak esta pensado para impuestos, Verifactu y operaciones del dia a dia, no para conversaciones genericas sin contexto.',
    icon: ShieldCheck,
  },
];

const compatiblePoints = [
  'Holded entra como fuente compatible. Isaak sigue marcando la experiencia.',
  'Preparado para sumar nuevas integraciones sin cambiar la voz ni el criterio de Isaak.',
  'Pensado para empresarios y equipos que quieren claridad, no mas complejidad tecnica.',
  'Puerta natural a la experiencia completa de verifactu.business cuando quieras mas profundidad.',
];

const steps = [
  {
    step: '1',
    title: 'Activa Isaak',
    body: 'Empieza desde ChatGPT o desde el onboarding seguro de verifactu.business.',
  },
  {
    step: '2',
    title: 'Conecta datos reales',
    body: 'Usa tu API key de Holded para que Isaak trabaje con contexto real desde el primer minuto.',
  },
  {
    step: '3',
    title: 'Desbloquea la experiencia completa',
    body: 'Cuando quieras más control, automatización y capa fiscal, das el salto a verifactu.business.',
  },
];

const faqItems = [
  {
    question: '¿Isaak es una solución oficial de Holded?',
    answer:
      'No. Holded aparece aquí como ERP compatible y fuente de datos. La experiencia, la lógica fiscal y la capa operativa pertenecen a Isaak dentro del ecosistema de verifactu.business.',
  },
  {
    question: '¿Necesito saber de APIs o configuración técnica?',
    answer:
      'No. El objetivo es justo el contrario: reducir fricción técnica y darte una activación guiada para que Isaak empiece a trabajar con datos reales.',
  },
  {
    question: '¿Qué gano cuando paso a verifactu.business?',
    answer:
      'Añades panel visual, histórico, trazabilidad, automatización, reglas fiscales y una relación mucho más profunda con Isaak como asistente fiscal inteligente.',
  },
  {
    question: '¿Esto me cierra solo a Holded?',
    answer:
      'No. Holded es una compatibilidad inicial y un buen punto de entrada, pero la arquitectura de Isaak está pensada para abrirse a más fuentes y más flujos con el tiempo.',
  },
];

export default function HoldedCampaignPage() {
  const appUrl = getAppUrl();
  const chatgptAppUrl =
    process.env.NEXT_PUBLIC_HOLDED_CHATGPT_APP_URL ||
    `${appUrl}/onboarding/holded?channel=chatgpt&source=holded_landing`;
  const opensDirectOnboarding = !process.env.NEXT_PUBLIC_HOLDED_CHATGPT_APP_URL;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_40%,#ffffff_100%)] text-slate-900">
      <section className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            verifactu.business
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
            <a href="#como-funciona" className="hover:text-slate-900">
              Cómo funciona
            </a>
            <a href="#que-desbloquea" className="hover:text-slate-900">
              Qué desbloquea
            </a>
            <a href="#faq" className="hover:text-slate-900">
              FAQ
            </a>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5460]/20 bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold text-[#ff5460]">
            <Sparkles className="h-3.5 w-3.5" />
            Compatible con Holded
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
              <Bot className="h-3.5 w-3.5 text-[#ff5460]" />
              Isaak by verifactu.business
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Isaak toma el mando aunque empieces con Holded.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Holded solo aporta contexto inicial. Quien resume, prioriza, explica y te acompaña en
              decisiones fiscales y operativas es Isaak, dentro del ecosistema de
              verifactu.business.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#ef4654]"
              >
                {opensDirectOnboarding ? 'Activar Isaak ahora' : 'Abrir Isaak en ChatGPT'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://verifactu.business/que-es-isaak"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Descubrir la experiencia completa
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {opensDirectOnboarding
                ? 'Mientras la URL pública definitiva de ChatGPT se estabiliza, este botón te lleva al onboarding seguro de Isaak para no romper la experiencia.'
                : 'Este botón abre la app pública de ChatGPT y activa el flujo correcto de Isaak para trabajar con datos reales.'}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {compatiblePoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{point}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(255,84,96,0.35)]">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(145deg,#fff7f7_0%,#f8fbff_100%)] p-6 sm:p-8">
              <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={18}
                  height={18}
                  className="h-4 w-4"
                />
                Fuente compatible
              </div>
              <div className="grid gap-4 sm:grid-cols-[0.95fr_1.05fr] sm:items-center">
                <div className="rounded-[1.25rem] border border-white/80 bg-white/80 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
                    Isaak al frente
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Holded trae datos. Isaak los convierte en prioridades, lenguaje claro y
                    siguiente paso.
                  </div>
                </div>
                <div className="flex justify-center">
                  <Image
                    src="/Isaak/isaak-vs-holded.png"
                    alt="Isaak como protagonista con Holded como compatibilidad"
                    width={560}
                    height={560}
                    className="h-auto w-full max-w-[20rem]"
                    priority
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Lo que ya hace Isaak cuando Holded solo aporta el contexto
              </div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  Explicar ventas, gastos, cobros y señales de riesgo con lenguaje claro.
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  Ayudarte a revisar facturas, contactos, proyectos y prioridades operativas.
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  Preparar el salto a la experiencia completa de verifactu.business cuando quieras
                  más control.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="que-desbloquea" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Lo importante no es la conexión. Es lo que Isaak desbloquea después.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Hemos diseñado esta entrada compatible con Holded para que empieces rápido, pero el
              centro del producto es Isaak: un asistente fiscal inteligente pensado para ayudarte a
              decidir mejor y trabajar con menos fricción.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {benefitCards.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#ef4654]"
            >
              Ver demo guiada de Isaak
            </Link>
            <Link
              href="/planes"
              className="inline-flex items-center justify-center rounded-xl border border-[#ff5460] px-6 py-3 text-sm font-semibold text-[#ff5460] hover:bg-[#ff5460]/10"
            >
              Comparar planes
            </Link>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_100%)] p-8 text-white shadow-sm lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                Activacion guiada
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Un camino simple: activar, entender, escalar.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                La entrada compatible con Holded te permite empezar con datos reales. Después, si
                quieres un entorno más completo, sigues profundizando en la misma entidad: Isaak
                dentro de verifactu.business.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((item) => (
                <article
                  key={item.step}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Paso {item.step}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">{item.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f2660] hover:bg-slate-100"
              >
                Activar flujo con Holded
              </Link>
              <Link
                href="/producto/integraciones"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver otras integraciones
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-10">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness className="mt-1 h-5 w-5 shrink-0 text-[#ff5460]" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Cuando quieras más que una activación inicial, entras en verifactu.business.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  Ahí es donde Isaak gana profundidad: panel visual, histórico, trazabilidad,
                  automatización, reglas fiscales y una relación mucho más rica con tus procesos,
                  documentos y decisiones.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="https://verifactu.business"
                    className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Empezar prueba con datos reales
                  </Link>
                  <Link
                    href="/recursos/contacto"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Hablar con soporte de activación
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
              Preguntas frecuentes
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
              Lo esencial antes de activar Isaak con Holded como fuente compatible.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Isaak es la experiencia principal. Holded aparece aqui como ERP compatible y punto de
            entrada, no como marca protagonista.
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/holded/support" className="hover:text-slate-900">
              Soporte
            </Link>
            <Link href="/holded/privacy" className="hover:text-slate-900">
              Privacidad
            </Link>
            <Link href="/holded/terms" className="hover:text-slate-900">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
