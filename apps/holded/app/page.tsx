import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Link2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import HoldedHeroVisual from './components/HoldedHeroVisual';

const HOLDED_APP_URL = 'https://app.verifactu.business';
const HOLDED_CHAT_URL = `${HOLDED_APP_URL}/dashboard/isaak`;

const buildOnboardingUrl = (source: string) => {
  const onboardingUrl = `${HOLDED_APP_URL}/onboarding/holded?channel=chatgpt&source=${source}&next=${encodeURIComponent(HOLDED_CHAT_URL)}`;
  return `${HOLDED_APP_URL}/login?source=holded_landing&next=${encodeURIComponent(onboardingUrl)}`;
};

export const metadata: Metadata = {
  title: 'Isaak para Holded | Control claro de tu negocio',
  description:
    'Conecta Holded y pregunta en lenguaje natural por ventas, gastos y beneficio sin perder tiempo.',
};

const benefits = [
  {
    title: '💬 Preguntas en lenguaje tuyo',
    body: 'No tienes que aprender a usar Holded ni entender reportes técnicos. Pregunta como hablarías con un colega: "¿Cómo voy de ventas en julio?" y Isaak te mostrará tus números.',
  },
  {
    title: '⚡ Respuestas al instante',
    body: 'Tu información está en Holded. Isaak la lee en tiempo real. Desde que preguntas hasta que tienes respuesta: menos de 2 segundos.',
  },
  {
    title: '🎯 Información sin filtros ni tecnicismos',
    body: 'Olvídate de exportar a Excel, copiar números o descifrar columnas. Isaak te dice qué significa tu información de verdad.',
  },
  {
    title: '🚨 Alertas de lo que importa',
    body: 'Antes de que sea un problema, Isaak te avisa: facturas que no cobras, pagos que no hiciste, o gastos raros.',
  },
];

const faqItems = [
  {
    question: '¿Pero si no entiendo Holded?',
    answer:
      'Perfecto, ese es exactamente el punto. Isaak está entrenado para explicar lo que Holded hace de forma que lo entiendas sin ser contable.',
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'Empiezas con plan gratis y puedes subir cuando te compense. Sin sorpresas ni permanencias forzosas.',
  },
  {
    question: '¿Y si desconecto Holded?',
    answer:
      'Puedes desconectar cuando quieras. Isaak pierde acceso y tu cuenta Holded sigue igual que siempre.',
  },
  {
    question: '¿Funciona en móvil?',
    answer:
      'Sí. Puedes preguntar desde web y móvil y mantener el mismo contexto de tu negocio.',
  },
  {
    question: '¿Puedo usarlo con mi equipo?',
    answer:
      'Sí. Dependiendo del plan puedes trabajar con más usuarios y compartir contexto operativo.',
  },
  {
    question: '¿Reemplaza a mi contable?',
    answer:
      'No. Isaak te ayuda a entender y actuar antes, pero no sustituye asesoramiento profesional acreditado.',
  },
];

export default function HoldedHomePage() {
  return (
    <main className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Isaak para Holded"
                width={22}
                height={22}
                className="h-[22px] w-[22px] object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-[1.18rem] font-semibold text-slate-900">Isaak para Holded</div>
              <div className="text-sm font-medium text-slate-600">Asistente contable</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
            <Link href="#beneficios" className="hover:text-slate-900">
              Beneficios
            </Link>
            <Link href="/planes" className="hover:text-slate-900">
              Planes
            </Link>
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
          </nav>

          <Link
            href={buildOnboardingUrl('holded_home_nav')}
            className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
          >
            Conectar cuenta
          </Link>
        </div>
      </header>

      <section id="solucion" className="py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                <Link2 className="h-3.5 w-3.5 text-[#ff5460]" />
                Conoce a Isaak
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.45rem] sm:leading-[1.04]">
                Tu asistente de contabilidad que entiende tu negocio sin tecnicismos.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Isaak interpreta tus datos de Holded para responder cualquier duda sobre ventas,
                gastos, tesorería y beneficio de forma clara y directa.
              </p>

              <p className="mt-3 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                No necesitas saber leer balances. Solo pregunta.
              </p>

              <div className="mt-7 rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  Ejemplos de lo que puedes preguntarle
                </div>
                <ul className="mt-5 space-y-4 text-sm text-slate-700">
                  <li className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">💬 Isaak, ¿cómo voy de ventas en julio?</div>
                    <div className="mt-2 text-[#ff5460]">
                      📊 Has facturado 12.450€ en julio. Un 8% más que en junio. Los clientes
                      principales fueron Empresa X y Empresa Y.
                    </div>
                  </li>
                  <li className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">💬 ¿Me falta algún pago importante?</div>
                    <div className="mt-2 text-[#ff5460]">
                      ⚠️ Sí, hay 5 facturas sin pagar. La más antigua es de hace 47 días
                      (Cliente B, 3.200€).
                    </div>
                  </li>
                  <li className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">💬 ¿Cuánto dinero tengo para proveedores?</div>
                    <div className="mt-2 text-[#ff5460]">
                      💰 Hoy tendrías 8.750€ libres si cobras lo pendiente de Empresa X.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="text-sm font-semibold text-amber-900">Qué necesitas para conectar</div>
                <div className="mt-3 flex items-start gap-2 text-sm text-amber-800">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  Una cuenta activa de Holded y tu API key.
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={buildOnboardingUrl('holded_home_hero')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Conectar Holded via API
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/planes"
                  className="inline-flex items-center justify-center rounded-xl border border-[#ff5460]/40 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ver planes
                </Link>
              </div>
            </div>

            <HoldedHeroVisual />
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Esto cambia cuando Isaak llega
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Trabajar con números deja de ser lento y confuso. Isaak te da contexto y siguiente
              acción en el momento.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <Sparkles className="h-5 w-5" />
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
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_100%)] p-8 text-white lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                Inicio rápido
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Empieza en 3 minutos</h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                Conecta tu Holded y empieza a preguntar con contexto real desde el primer momento.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Paso 1</div>
                <h3 className="mt-3 text-lg font-semibold text-white">Copia tu API key</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">Entra en Holded, abre configuración y copia tu clave.</p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Paso 2</div>
                <h3 className="mt-3 text-lg font-semibold text-white">Conecta tu empresa</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">Pega la clave en el onboarding y activa el contexto automáticamente.</p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Paso 3</div>
                <h3 className="mt-3 text-lg font-semibold text-white">Pregunta lo que necesites</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">Desde ese momento tu asistente contable es una conversación.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="seguridad" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
                ¿Puedo confiar?
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Sí. Y de forma transparente.
              </h2>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-slate-900">API key, no contraseña</div>
                <div className="mt-1 text-sm text-slate-600">Puedes desconectar el acceso cuando quieras.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-slate-900">Tus datos siguen siendo tuyos</div>
                <div className="mt-1 text-sm text-slate-600">Isaak interpreta información para ayudarte a decidir mejor.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Preguntas frecuentes
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Respuestas rápidas para decidir con seguridad.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                <TriangleAlert className="h-3.5 w-3.5" />
                Empieza sin riesgo
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Haz tu primera pregunta hoy
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Conecta Holded, valida tu contexto y decide después si escalar a más capacidad.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={buildOnboardingUrl('holded_home_final_cta')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
              >
                Conectar mi Holded
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/planes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        Powered by{' '}
        <a
          href="https://verifactu.business"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-slate-800"
        >
          verifactu.business
        </a>
      </footer>
    </main>
  );
}
