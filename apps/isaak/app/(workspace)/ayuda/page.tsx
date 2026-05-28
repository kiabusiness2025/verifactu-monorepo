// V1 LAUNCH (2026-05-28) — Centro de ayuda para Isaak.
//
// Contiene:
//   - Cómo conectar Holded paso a paso (con capturas conceptuales)
//   - Qué puede hacer Isaak (catálogo de tools y ejemplos de preguntas)
//   - FAQ
//   - Cómo escribir buenas preguntas
//   - Cómo desconectarse y eliminar datos
//   - Contacto soporte
//
// Página estática server component — sin fetch ni estado.
// Ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md.

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  Brain,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  Landmark,
  Lock,
  Mail,
  MessageCircle,
  Plug,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ayuda — Isaak',
  description:
    'Centro de ayuda de Isaak: cómo conectar Holded, qué puedes preguntar, ejemplos de prompts útiles y resolución de problemas.',
};

const EXAMPLE_QUESTIONS = [
  {
    category: 'Ventas y clientes',
    icon: TrendingUp,
    items: [
      '¿Cuáles fueron mis 10 facturas más altas de este trimestre?',
      'Lista los clientes con más facturación en 2026.',
      '¿Qué clientes me deben dinero hoy?',
      'Resúmeme las ventas del último mes vs el anterior.',
    ],
  },
  {
    category: 'Gastos y compras',
    icon: Receipt,
    items: [
      '¿Cuánto he gastado en proveedores este mes?',
      'Lista mis gastos por categoría del Q1.',
      '¿Tengo facturas de compra pendientes de pagar?',
      'Detecta si hay gastos duplicados en los últimos 90 días.',
    ],
  },
  {
    category: 'Fiscal y AEAT',
    icon: FileText,
    items: [
      '¿Cuál es el plazo del modelo 303 del Q2?',
      'Resúmeme mi IVA estimado del trimestre.',
      '¿Qué casillas del 303 me afectan según mi régimen?',
      'Explícame qué deduce el régimen de caja.',
    ],
  },
  {
    category: 'Facturas (borradores)',
    icon: FileText,
    items: [
      'Crea un borrador de factura para Acme SL por 1000€ de consultoría.',
      '¿Qué series de numeración tengo configuradas?',
      'Descárgame el PDF de la factura 2026/0042.',
      'Lista los impuestos que tengo configurados en Holded.',
    ],
  },
  {
    category: 'Contabilidad',
    icon: Landmark,
    items: [
      'Muéstrame el libro diario del mes pasado.',
      'Calcula mi P&L del año en curso.',
      '¿Cuál es el margen neto del Q1?',
      'Saldo de mis cuentas de tesorería.',
    ],
  },
];

const TIPS = [
  {
    title: 'Sé concreto con las fechas',
    bad: '¿Cómo van las cosas?',
    good: '¿Cuánto facturé entre 1 enero y 31 marzo de 2026?',
  },
  {
    title: 'Pregunta antes de actuar',
    bad: 'Crea una factura y emítela.',
    good: 'Crea un borrador de factura para Acme SL por 500€ de consultoría. Te confirmo antes de cualquier emisión.',
  },
  {
    title: 'Usa nombres reales',
    bad: 'Dame las facturas de un cliente importante.',
    good: 'Dame las facturas de Acme SL del último año.',
  },
  {
    title: 'Para normativa, pide la fuente',
    bad: '¿Puedo deducir esto?',
    good: '¿Es deducible un coche para uso profesional en estimación directa? Cítame el artículo de la ley.',
  },
];

const FAQ = [
  {
    q: '¿Cómo conecto Holded por primera vez?',
    a: 'Necesitas tu API key de Holded. Genera una en Holded → Configuración → Desarrolladores → Crear nueva API key, dándole el nombre "Isaak". Pega esa key en Ajustes → Integración Holded. Holded solo muestra la key una vez, así que cópiala antes de cerrar la pestaña.',
  },
  {
    q: '¿Puedo conectar varias empresas de Holded?',
    a: 'En V1 cada cuenta de Isaak se conecta a una sola empresa de Holded. Si gestionas varias, puedes crear cuentas separadas. La gestión multi-empresa desde una sola cuenta llegará en V2.',
  },
  {
    q: '¿Isaak emite facturas a AEAT directamente?',
    a: 'No. Isaak crea borradores en tu Holded. Tú apruebas el borrador en Holded y es Holded quien firma y registra a VeriFactu. Es deliberado — así mantienes el control de qué se emite.',
  },
  {
    q: '¿Qué pasa si Isaak da una respuesta equivocada?',
    a: 'Por construcción, las consultas a tu Holded se hacen leyendo en directo — no inventamos cifras. Si una respuesta no cuadra, pídele a Isaak que repita la consulta indicando las fechas y filtros exactos. Si persiste, escríbenos.',
  },
  {
    q: '¿Por qué hay un límite de 10 mensajes/hora en el plan Free?',
    a: 'La IA cuesta y queremos mantener el plan Free realmente gratis sin meter tarjeta. El límite por hora (no por día) deja espacio para preguntas reales. Si necesitas más, el plan Pro es ilimitado.',
  },
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Desde Ajustes → Plan y facturación → Gestionar plan. Te lleva al portal de Stripe donde puedes cancelar en un click. Mantienes acceso hasta el final del periodo pagado.',
  },
  {
    q: '¿Mis datos de Holded se guardan en Isaak?',
    a: 'Las consultas se hacen en vivo. Guardamos solo: tu API key cifrada (AES-256-GCM), tu historial de conversaciones (para que puedas releerlas) y métricas agregadas de uso. Si desconectas Holded, no podemos volver a leer tu ERP.',
  },
  {
    q: '¿Qué pasa si dejo de pagar?',
    a: 'Tu cuenta vuelve al plan Free (chat ilimitado por hora, sin Holded). No borramos tu historial de conversaciones — sigue ahí si vuelves a pagar.',
  },
  {
    q: '¿Puedo usar Isaak desde el móvil?',
    a: 'Sí. La app web funciona en navegador móvil. Para una experiencia más nativa, en V2+ tendremos PWA con notificaciones push.',
  },
  {
    q: '¿Qué modelo IA usa Isaak por dentro?',
    a: 'Claude (Anthropic) como motor primario y GPT-4o (OpenAI) como fallback automático si Claude tiene un incidente. Tú no tienes que configurar nada ni pagar nada extra.',
  },
];

export default function AyudaPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Centro de ayuda</h1>
        <p className="text-[12px] text-slate-500">
          Cómo sacarle el máximo a Isaak con tu Holded.
        </p>
      </div>

      <div className="mx-auto w-full max-w-4xl px-5 py-6 space-y-10">
        {/* Quickstart */}
        <Section
          icon={Sparkles}
          title="Empezar en 1 minuto"
          subtitle="Tres pasos y ya estás preguntando con datos reales."
        >
          <ol className="space-y-3">
            {[
              {
                num: 1,
                title: 'Conecta tu Holded',
                body: (
                  <>
                    Ve a{' '}
                    <Link
                      href="/integration-holded"
                      className="font-medium text-[#2361d8] hover:underline"
                    >
                      Integración Holded
                    </Link>{' '}
                    y pega tu API key. 30 segundos.
                  </>
                ),
              },
              {
                num: 2,
                title: 'Abre el chat',
                body: 'En el menú lateral pulsa “Chat”. Verás algunas preguntas sugeridas para arrancar.',
              },
              {
                num: 3,
                title: 'Pregunta lo que necesites',
                body: 'En español, con tus palabras. Si quieres concreción, especifica fechas y nombres reales.',
              },
            ].map(({ num, title, body }) => (
              <li
                key={num}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-xs font-bold text-white">
                  {num}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#011c67]">{title}</h3>
                  <p className="mt-0.5 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Qué puedes preguntar */}
        <Section
          icon={MessageCircle}
          title="Qué le puedes preguntar a Isaak"
          subtitle="50+ preguntas reales clasificadas por área. Cópialas tal cual."
        >
          <div className="space-y-4">
            {EXAMPLE_QUESTIONS.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.category}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#011c67]">
                    <Icon className="h-4 w-4 text-[#2361d8]" />
                    {cat.category}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {cat.items.map((q) => (
                      <li
                        key={q}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="text-slate-400">&ldquo;</span>
                        {q}
                        <span className="text-slate-400">&rdquo;</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Tips para mejores respuestas */}
        <Section
          icon={Brain}
          title="Cómo escribir mejores preguntas"
          subtitle="Pequeños cambios → respuestas mucho más útiles."
        >
          <div className="space-y-3">
            {TIPS.map(({ title, bad, good }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-[#011c67]">{title}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                      Mejor evitar
                    </div>
                    <p className="mt-1 text-sm italic text-rose-900">&ldquo;{bad}&rdquo;</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Mejor así
                    </div>
                    <p className="mt-1 text-sm italic text-emerald-900">&ldquo;{good}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Alertas */}
        <Section
          icon={Bell}
          title="Alertas fiscales automáticas"
          subtitle="Isaak vigila los plazos de tus modelos AEAT para que no se te pase ninguno."
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm leading-6 text-amber-900">
              Te enviamos un email <strong>15, 7, 3 y 1 días antes</strong> de cada vencimiento
              del 303, 130 y resto de modelos. Los puedes revisar en cualquier momento desde{' '}
              <Link href="/alertas" className="font-medium underline">
                Alertas
              </Link>{' '}
              en el menú lateral. No hay que configurarlas — se activan automáticamente al
              conectar Holded.
            </p>
          </div>
        </Section>

        {/* Seguridad y privacidad */}
        <Section
          icon={ShieldCheck}
          title="Seguridad y privacidad"
          subtitle="Cómo protegemos tu API key y tus datos."
        >
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <ul className="space-y-2 text-sm leading-6 text-emerald-900">
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Tu API key de Holded se cifra con <strong>AES-256-GCM</strong> antes de
                  guardarse. Solo nosotros podemos descifrarla.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Las consultas a Holded se hacen en vivo desde nuestros servidores. No
                  copiamos toda tu base de datos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Puedes <strong>desconectar Holded en un click</strong> desde Integración
                  Holded. La key se borra inmediatamente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  El historial de chat queda en tu cuenta — solo tú lo ves. Si nos lo pides,
                  lo borramos a fondo.
                </span>
              </li>
            </ul>
          </div>
        </Section>

        {/* Resolución de problemas */}
        <Section
          icon={AlertTriangle}
          title="Resolución de problemas"
          subtitle="Los problemas más comunes y cómo solucionarlos."
        >
          <div className="space-y-3">
            {[
              {
                q: 'Isaak dice que no puede acceder a Holded',
                a: 'Suele ser que la API key fue revocada en Holded o caducó. Genera una nueva en Holded → Desarrolladores y vuelve a pegarla en Integración Holded.',
              },
              {
                q: 'Veo respuestas con cifras a 0 o vacías',
                a: 'Probablemente las fechas que pides no tienen datos. Prueba con un periodo mayor (todo el año, por ejemplo) y luego acota.',
              },
              {
                q: 'No recibo emails de alertas fiscales',
                a: 'Revisa la carpeta de spam y añade noreply@verifactu.business a tus contactos. Si sigue fallando, verifica que el email de tu cuenta sea correcto en Ajustes → Perfil.',
              },
              {
                q: 'El chat tarda mucho en responder',
                a: 'Cuando Isaak hace consultas a Holded, la respuesta puede tardar 5-15 segundos según la cantidad de datos. Si tarda más de 30s, recarga y vuelve a preguntar.',
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-[#011c67]">{q}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section
          icon={HelpCircle}
          title="Preguntas frecuentes"
          subtitle="Las respuestas a las dudas más habituales."
        >
          <dl className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:bg-slate-50"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-[#011c67] [&::-webkit-details-marker]:hidden">
                  {q}
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
              </details>
            ))}
          </dl>
        </Section>

        {/* Contacto */}
        <Section icon={Mail} title="¿Sigues con dudas?" subtitle="Estamos aquí para ayudarte.">
          <div className="rounded-2xl border border-[#2361d8]/15 bg-[linear-gradient(135deg,#f0f5ff_0%,#ffffff_100%)] p-5 text-center">
            <p className="text-sm leading-6 text-slate-700">
              Escríbenos a{' '}
              <a
                href="mailto:soporte@verifactu.business"
                className="font-medium text-[#2361d8] hover:underline"
              >
                soporte@verifactu.business
              </a>
              . Respondemos en menos de 24 h en días laborables.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2361d8]/10">
          <Icon className="h-5 w-5 text-[#2361d8]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[#011c67]">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
