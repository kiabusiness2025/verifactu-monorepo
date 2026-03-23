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
  title: 'Isaak | Tu asistente de contabilidad entrenado en Holded',
  description:
    'Isaak es un agente IA que interpreta tus datos de Holded. Pregunta sobre ventas, gastos, tesorería y más sin abrir Holded nunca más.',
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
                Conoce a Isaak
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-[3.45rem] sm:leading-[1.04]">
                Tu asistente de contabilidad que entiende tu negocio sin tecnicismos.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Isaak es un agente IA entrenado para interpretar tus datos de contabilidad que viven en Holded. Se conecta a tu empresa, aprende cómo funciona y responde a cualquier duda sobre tu situación fiscal, ventas, gastos, tesorería y más.
              </p>

              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg font-semibold">
                No necesitas saber leer balances. Solo pregunta.
              </p>

              <div className="mt-7 rounded-3xl border border-[#ff5460]/20 bg-[#ff5460]/5 p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  Ejemplos de lo que puedes preguntarle 👇
                </div>
                <ul className="mt-5 space-y-4 text-sm text-slate-700">
                  <li className="rounded-2xl bg-white p-4 border border-slate-200">
                    <div className="font-semibold text-slate-900">💬 Isaak, ¿cómo voy de ventas en julio?</div>
                    <div className="mt-2 text-[#ff5460]">📊 Has facturado 12.450€ en julio. Un 8% más que en junio. Los clientes principales fueron Empresa X y Empresa Y.</div>
                  </li>
                  <li className="rounded-2xl bg-white p-4 border border-slate-200">
                    <div className="font-semibold text-slate-900">💬 ¿Me falta algún pago importante?</div>
                    <div className="mt-2 text-[#ff5460]">⚠️ Sí, hay 5 facturas sin pagar. La más antigua es de hace 47 días (Cliente B, 3.200€). Te recomiendo contactar primero.</div>
                  </li>
                  <li className="rounded-2xl bg-white p-4 border border-slate-200">
                    <div className="font-semibold text-slate-900">💬 ¿Cuánto dinero tengo para pagar a proveedores?</div>
                    <div className="mt-2 text-[#ff5460]">💰 Hoy tendrías 8.750€ libres si cobras lo que te debe Empresa X. Sin eso, tienes 3.100€.</div>
                  </li>
                  <li className="rounded-2xl bg-white p-4 border border-slate-200">
                    <div className="font-semibold text-slate-900">💬 ¿Gastos que puedo deducir la próxima declaración?</div>
                    <div className="mt-2 text-[#ff5460]">🧾 Hay 850€ en gastos sin clasificar. Incluyen dietas, suministros y software. Puedes deducirlos todos.</div>
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
              Esto cambia cuando Isaak llega
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Normalmente, trabajar con números de tu empresa es lento y cansa. Vamos a mostrarte cómo Isaak lo hace diferente.
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
                ✨ Inicio rápido
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Empieza en 3 minutos. Oh, y es gratis.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                Solo necesitas tu Holded y ganas tener a Isaak interpreando tus números en tiempo real.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Paso 1
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">🔑 Copia tu API key</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">Entra en Holded → Configuración → API. Copia tu clave. Tardaras 30 segundos.</p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Paso 2
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">🔗 Conecta tu empresa</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">Pega la clave aquí y Isaak carga tus datos. La magia sucede automaticamente en menos un minuto.</p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Paso 3
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">💬 Pregunta lo que necesites</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">A partir de aquí, tu asistente fiscal es una pregunta. "Isaak, ¿cómo voy?" y listo.</p>
              </article>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0f2660] transition-all hover:bg-slate-100 hover:shadow-lg"
              >
                Conectar Holded ahora
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
                ¿Puedo confiar?
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                La respuesta corta: sí. Y te lo explicamos.
              </h2>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔐</span>
                  <div>
                    <div className="font-semibold text-slate-900">Isaak es nuestro software</div>
                    <div className="mt-1 text-sm text-slate-600">No es un plugin de Holded ni afecta porque Holded seguirá funcionando igual que siempre.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔌</span>
                  <div>
                    <div className="font-semibold text-slate-900">API key, no contraseña</div>
                    <div className="mt-1 text-sm text-slate-600">Si cambias de opinión, desconectas en un click. El acceso termina al instante.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <div className="font-semibold text-slate-900">Tus datos son tuyos</div>
                    <div className="mt-1 text-sm text-slate-600">Isaak los lee para interpretarlos. No los guarda en otro lado ni los vende ni los comparte.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="font-semibold text-slate-900">Gratis siempre para probar</div>
                    <div className="mt-1 text-sm text-slate-600">Conecta hoy, prueba un mes sin límite, cancela sin penalización. Sin sorpresas.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="faq" className="bg-white py-14">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Las dudas que suelen surgir
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Si algo no está claro, aquí probablemente encuentres la respuesta.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Pero si no entiendo Holded?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Perfecto, eso es exactamente el punto. Isaak está entrenado para explicar lo que Holded hace de forma que lo entiendas sin ser contador.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Cuánto cuesta?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Primero es gratis un mes completo. Sin sorpresas después. Solo pagas si lo vales para ti.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Y si desconecto Holded?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Unclick. Isaak pierde acceso al instante. Holded sigue igual. No pasa nada raro.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Funciona en móvil?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Claro. Pregunta a Isaak desde donde quieras. App mobile, web, donde estés. Los datos te siguen.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Otros contables pueden usarlo?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Sí. Es para tu equipo. Invita a quien necesite (socios, contador, empleado de finanzas). Los datos son compartidos.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-base font-semibold text-slate-900">¿Reemplaza a mi contador?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">No. Tu contador sigue siendo necesario para cumplimiento legal. Isaak es tu asistente diario de información. Se complementan.</p>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5460]">
                <TriangleAlert className="h-3.5 w-3.5" />
                La primera pregunta es gratis
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Prueba a Isaak hoy. Sin obligación a futuro.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Conecta tu Holded, hazle tu primera pregunta y descubre la diferencia. No es magia, es información interpretada para que la entiendas. Luego decides si te vale.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={chatgptAppUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ef4654] hover:shadow-xl"
              >
                Conectar mi Holded
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Vuelvo al inicio
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
  const chatgptAppUrl = normalizeHoldedOnboardingUrl(
    process.env.NEXT_PUBLIC_HOLDED_CHATGPT_APP_URL
  );
  const params = await searchParams;
  const variant = Array.isArray(params?.variant) ? params?.variant[0] : params?.variant;

  return variant === 'standalone' ? (
    <StandaloneHoldedPage chatgptAppUrl={chatgptAppUrl} />
  ) : (
    <IntegratedHoldedPage chatgptAppUrl={chatgptAppUrl} />
  );
}
