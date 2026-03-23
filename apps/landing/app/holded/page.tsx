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
import Header from '../components/Header';
import { Container, Footer } from '../lib/home/ui';
import HoldedHeroVisual from './components/HoldedHeroVisual';

export const metadata: Metadata = {
  title: 'Integracion Holded + Isaak | verifactu.business',
  description:
    'Conecta Holded con Isaak para activar control fiscal continuo, deteccion de riesgos y trazabilidad operativa sobre datos reales.',
  icons: {
    icon: [{ url: '/holded/icon.png', type: 'image/png' }],
    shortcut: ['/holded/icon.png'],
    apple: [{ url: '/holded/icon.png', type: 'image/png' }],
  },
};

const standaloneNavItems = [
  { label: 'Solucion', href: '#solucion' },
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Seguridad', href: '#seguridad' },
  { label: 'FAQ', href: '#faq' },
];

const integratedNavItems = [
  { label: 'Compatibilidad', href: '#compatibilidad' },
  { label: 'Valor', href: '#valor' },
  { label: 'Recorrido', href: '#recorrido' },
  { label: 'FAQ', href: '#faq' },
];

const navLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Qué es Isaak', href: '/que-es-isaak' },
  { label: 'Compatibilidad', href: '/holded' },
  { label: 'Planes', href: '/planes' },
  { label: 'Precios', href: '/precios' },
  { label: 'Contacto', href: '/recursos/contacto' },
];

const keyBenefits = [
  {
    title: 'Facturas, gastos y cobros leídos al instante',
    body: 'Isaak accede a tus datos reales de Holded via API y los convierte en respuestas, alertas y prioridades diarias.',
  },
  {
    title: 'Sin exportar, sin copiar, sin pegar',
    body: 'La conexión API es directa. No necesitas preparar ningún fichero. Holded habla con ChatGPT y Isaak interpreta.',
  },
  {
    title: 'Datos técnicos en lenguaje humano',
    body: 'Isaak actúa de traductor: convierte el lenguaje del ERP en respuestas claras adaptadas a cómo piensa tu negocio.',
  },
  {
    title: 'Alertas y riesgos antes del cierre',
    body: 'Detecta liquidez baja, facturas pendientes críticas, gastos anómalos o inconsistencias antes de que sean un problema.',
  },
];

const brandPillars = [
  {
    title: 'Holded aporta el dato de origen',
    body: 'Ventas, gastos, cobros y operativa entran con continuidad desde un ERP conocido por el usuario.',
  },
  {
    title: 'Isaak aporta criterio fiscal',
    body: 'No es solo lectura de datos. Prioriza riesgos, revisiones y siguientes acciones con un lenguaje claro.',
  },
  {
    title: 'verifactu.business aporta trazabilidad',
    body: 'La compatibilidad con Holded encaja dentro de una plataforma pensada para control, cumplimiento y crecimiento.',
  },
];

const integratedFlow = [
  {
    title: 'Entrada compatible, no producto separado',
    body: 'En verifactu.business, Holded funciona como puerta de entrada para activar contexto real sin fragmentar la marca.',
  },
  {
    title: 'Misma experiencia, mas contexto',
    body: 'El usuario sigue dentro del ecosistema de verifactu.business. La compatibilidad solo amplía la capacidad de Isaak.',
  },
  {
    title: 'Activacion cuando tenga sentido',
    body: 'La decisión de conectar se plantea al final del recorrido, no como único objetivo editorial de la página.',
  },
];

const activationSteps = [
  {
    step: '01',
    title: 'Obtén tu API key de Holded',
    body: 'Entra en tu cuenta Holded → Configuración → API. Copia la clave. Es el único requisito técnico.',
  },
  {
    step: '02',
    title: 'Pégala en el onboarding guiado',
    body: 'ChatGPT se conecta a Holded en tiempo real. Isaak carga tu contexto fiscal en menos de un minuto.',
  },
  {
    step: '03',
    title: 'Pregunta en lenguaje natural',
    body: '«¿Tengo tesorería para aguantar el trimestre?», «¿Qué facturas están en riesgo?». Isaak te responde con tus datos.',
  },
];

const trustPoints = [
  'Solucion externa, no producto oficial de Holded.',
  'La activacion depende de la API key conectada.',
  'La informacion se usa para control fiscal y contexto operativo.',
  'Compatible con Holded hoy y preparada para ampliar integraciones.',
];

const faqItems = [
  {
    question: 'Cuales son los riesgos de no activar esto?',
    answer:
      'Sin supervision en tiempo real, muchas empresas detectan errores fiscales solo en cierre de mes. Multas, retrasos en auditorias internas y estrés innecesario. Isaak te da visibilidad diaria.',
  },
  {
    question: 'Necesito una configuracion tecnica compleja?',
    answer:
      'No. Solo tu API key de Holded. 3 minutos de onboarding guiado y ya ves datos reales. Sin configuracion, sin friccion tecnica.',
  },
  {
    question: 'Que gano con la version completa?',
    answer:
      'Mayor trazabilidad, automatizacion adicional, historico consolidado y mas control para equipos en crecimiento.',
  },
  {
    question: 'Cuanto tiempo puedo probar sin compromiso?',
    answer:
      'Sin limite. Activa hoy, opera con Isaak, escala a verifactu.business completo cuando decidas. Todo lo que generes se mantiene.',
  },
];

type SearchParams = Record<string, string | string[] | undefined>;

const HOLDED_ONBOARDING_BASE_URL = 'https://app.verifactu.business';

function normalizeHoldedOnboardingUrl(rawUrl: string | undefined) {
  const fallback = `${HOLDED_ONBOARDING_BASE_URL}/onboarding/holded?channel=chatgpt&source=holded_landing`;
  if (!rawUrl) return fallback;

  try {
    const parsed = new URL(rawUrl);
    const normalized = new URL(fallback);

    if (parsed.hostname === 'client.verifactu.business') {
      normalized.search = parsed.search;
      normalized.searchParams.set('channel', 'chatgpt');
      normalized.searchParams.set('source', 'holded_landing');
      return normalized.toString();
    }

    if (parsed.pathname === '/workspace/onboarding/holded') {
      parsed.pathname = '/onboarding/holded';
    }

    if (parsed.pathname !== '/onboarding/holded') {
      return fallback;
    }

    parsed.searchParams.set('channel', 'chatgpt');
    parsed.searchParams.set('source', 'holded_landing');
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function HoldedContent({ chatgptAppUrl }: { chatgptAppUrl: string }) {
  return (
    <>
      <section id="solucion" className="py-14 sm:py-18">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                <Link2 className="h-3.5 w-3.5 text-[#ff5460]" />
                Holded × ChatGPT — Isaak como intérprete
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.45rem] sm:leading-[1.04]">
                Tus datos de Holded, explicados en lenguaje humano.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Conecta tu cuenta de Holded via API y accede a un asistente que entiende tu
                contabilidad, facturación y tesorería como si fuera tuya. Isaak hace de intérprete:
                convierte el lenguaje técnico del ERP en respuestas claras, prioridades y alertas
                para que puedas tomar decisiones sin abrir ni una pantalla de Holded.
              </p>

              <div className="mt-7 rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  Qué puedes preguntarle cuando está conectado
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                    <span>«¿Cuánto IVA tengo pendiente de liquidar este trimestre?»</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                    <span>«¿Qué facturas de clientes llevan más de 60 días sin cobrar?»</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                    <span>
                      «¿Tengo tesorería suficiente para pagar nóminas en los próximos 30 días?»
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                    <span>
                      «¿Qué gastos del último mes se pueden deducir y no he categorizado?»
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="text-sm font-semibold text-amber-900">
                  Requisitos para usar esta integración
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Licencia activa de Holded —{' '}
                      <a
                        href="https://www.holded.com/es/precios"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-2 hover:text-amber-900"
                      >
                        ver planes de Holded
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      API key de tu cuenta Holded —{' '}
                      <a
                        href="https://developers.holded.com/reference/introduction"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-2 hover:text-amber-900"
                      >
                        cómo obtener tu API key
                      </a>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={chatgptAppUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
                >
                  Conectar Holded via API
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={chatgptAppUrl}
                  className="inline-flex items-center justify-center rounded-xl border border-[#ff5460]/40 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ver cómo funciona
                </Link>
              </div>

              <p className="mt-5 text-xs text-slate-500">
                <strong>Necesitas:</strong> licencia Holded activa + tu API key.{' '}
                <strong>Tiempo de conexión:</strong> menos de 3 minutos.
              </p>
            </div>

            <HoldedHeroVisual />
          </div>
        </Container>
      </section>

      <section id="beneficios" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Lo que Isaak puede hacer con tus datos de Holded
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              La API de Holded expone contabilidad, facturación, tesorería, contactos y más. Isaak
              convierte esa información en respuestas, alertas y decisiones concretas.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {keyBenefits.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5460]/10 text-[#ff5460]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_100%)] p-8 text-white lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                Proceso de conexión
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                De API key a asistente fiscal en 3 pasos
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                No hay integración técnica que preparar. Solo tu API key de Holded y el onboarding
                guiado.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {activationSteps.map((item) => (
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
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f2660] transition-all hover:bg-slate-100 hover:shadow-lg"
              >
                Conectar Holded ahora
              </Link>
              <Link
                href="/holded/demo-recording"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver video (2 minutos)
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section id="seguridad" className="bg-white py-14">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-[#ff5460]" />
                Confianza operativa
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                Seguridad, alcance y posicionamiento claro
              </h2>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5460]" />
                    <span>{point}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="faq" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Preguntas frecuentes
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Respuestas directas para equipos que quieren activar esta integracion con seguridad.
            </p>
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
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                <TriangleAlert className="h-3.5 w-3.5" />
                Siguiente paso recomendado
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Activa hoy. Cierra este mes sin sorpresas. Escala cuando quieras.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                No necesitas ser perfeccionista para empezar. Isaak te da valor inmediato: revision,
                riesgos priorizados y trazabilidad continua. Aunque el producto siga mejorando, los
                equipos que lo usan hoy ya ahorra horas y cierran mejor.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
              >
                Conectar tu Holded ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/que-es-isaak"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Mas sobre Isaak
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function IntegratedHoldedContent({ standaloneUrl }: { standaloneUrl: string }) {
  return (
    <>
      <section id="compatibilidad" className="py-14 sm:py-18">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm">
                <Link2 className="h-3.5 w-3.5 text-[#ff5460]" />
                Compatibilidad integrada en verifactu.business
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.3rem] sm:leading-[1.06]">
                Holded encaja dentro de verifactu.business como una compatibilidad prioritaria
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                No es un micrositio aislado ni una marca paralela. Es una forma clara de activar a
                Isaak con datos reales desde un ERP conocido y llevar esa información al entorno de
                control fiscal de verifactu.business.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/producto/integraciones"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1f55c0]"
                >
                  Ver integraciones compatibles
                </Link>
                <Link
                  href={standaloneUrl}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ver integración guiada Holded
                </Link>
              </div>
            </div>

            <HoldedHeroVisual />
          </div>
        </Container>
      </section>

      <section id="valor" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Cómo se reparte el valor dentro de la experiencia completa
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Holded da continuidad operativa. Isaak interpreta. verifactu.business ordena la
              experiencia completa para que el usuario no tenga que reconstruir el contexto por su
              cuenta.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {brandPillars.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="recorrido" className="py-14">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_100%)] p-8 text-white lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                Recorrido recomendado
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                De compatibilidad útil a experiencia completa de plataforma
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                Esta página explica el encaje de Holded dentro del ecosistema. La activación guiada
                vive en su propia landing para no mezclar contenido editorial con onboarding.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {integratedFlow.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Paso {index + 1}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={standaloneUrl}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f2660] hover:bg-slate-100"
              >
                Ir a la landing de integración
              </Link>
              <Link
                href="/que-es-isaak"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Entender mejor a Isaak
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section id="beneficios" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Beneficios que justifican esta compatibilidad dentro de la marca
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              El objetivo no es añadir otra integración más, sino reducir fricción para activar a
              Isaak sobre negocio real y preparar el salto a una operativa más sólida.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {keyBenefits.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="faq" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Preguntas frecuentes sobre el encaje de Holded en verifactu.business
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Respuestas orientadas a entender el papel de esta compatibilidad dentro de una
              experiencia más amplia, no solo como flujo de activación.
            </p>
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
        </Container>
      </section>
    </>
  );
}

function IntegratedHoldedPage({ chatgptAppUrl }: { chatgptAppUrl: string }) {
  const standaloneUrl = 'https://holded.verifactu.business/';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_44%,#ffffff_100%)] text-slate-900">
      <Header navLinks={navLinks} />

      <section className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <Container className="py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-[#ff5460]" />
              Holded como compatibilidad destacada
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
              <nav
                className="flex flex-wrap items-center gap-4 text-sm text-slate-600"
                aria-label="Subnavegacion Holded"
              >
                {integratedNavItems.map((item) => (
                  <a key={item.href} href={item.href} className="font-medium hover:text-slate-950">
                    {item.label}
                  </a>
                ))}
              </nav>

              <Link
                href={standaloneUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
              >
                Ver integración guiada
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <IntegratedHoldedContent standaloneUrl={standaloneUrl} />
      <Footer />
    </div>
  );
}

function StandaloneHoldedPage({ chatgptAppUrl }: { chatgptAppUrl: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_44%,#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link
            href="https://www.holded.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Image
              src="/brand/holded-logotype-dark.png"
              alt="Holded"
              width={110}
              height={30}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
            {standaloneNavItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-slate-950">
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href={chatgptAppUrl}
            className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
          >
            Activar integracion
          </Link>
        </div>
      </header>

      <HoldedContent chatgptAppUrl={chatgptAppUrl} />

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Integracion orientada a resultados fiscales: criterio operativo, prevencion y mejora
              continua.
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/holded/support" className="hover:text-slate-900">
                Soporte
              </Link>
              <Link href="/holded/privacy" className="hover:text-slate-900">
                Privacidad
              </Link>
              <Link href="/holded/terms" className="hover:text-slate-900">
                Terminos
              </Link>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Powered by{' '}
            <a
              href="https://verifactu.business"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800"
            >
              verifactu.business
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default async function HoldedCampaignPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const chatgptAppUrl = normalizeHoldedOnboardingUrl(process.env.NEXT_PUBLIC_HOLDED_CHATGPT_APP_URL);
  const params = await searchParams;
  const variant = Array.isArray(params?.variant) ? params?.variant[0] : params?.variant;

  return variant === 'standalone' ? (
    <StandaloneHoldedPage chatgptAppUrl={chatgptAppUrl} />
  ) : (
    <IntegratedHoldedPage chatgptAppUrl={chatgptAppUrl} />
  );
}
