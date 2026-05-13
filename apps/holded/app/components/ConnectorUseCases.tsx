/**
 * ConnectorUseCases — bloque de casos de uso reales del conector Holded para
 * Claude / ChatGPT. Muestra prompts naturales y respuestas de ejemplo basadas
 * en una cuenta Holded demo.
 *
 * Estructura:
 *  - Tabs por persona (asesoria | autonomo | pyme) con 2 ejemplos cada una.
 *  - Cada ejemplo: pregunta del usuario + respuesta sintetizada de la IA + chips
 *    con las capacidades usadas por el conector.
 *
 * Posicionamiento previsto: justo despues del bloque de capacidades actuales.
 */
'use client';

import { useState } from 'react';
import { Briefcase, Building2, MessageSquareText, Sparkles, User, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';

type ConnectorId = 'claude' | 'chatgpt';

type Theme = {
  accentText: string;
  accentBg: string;
  pill: string;
  chip: string;
};

type Example = {
  prompt: string;
  response: string;
  capabilities: string[];
};

type Persona = {
  id: 'asesoria' | 'autonomo' | 'pyme';
  label: string;
  Icon: ComponentType<{ className?: string }>;
  examples: Example[];
};

const THEMES: Record<ConnectorId, Theme> = {
  claude: {
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    pill: 'border-amber-200 bg-amber-50 text-amber-800',
    chip: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  chatgpt: {
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

// Ejemplos basados en una cuenta Holded demo (marzo 2026). En producción cada
// respuesta depende de los datos y permisos de la cuenta Holded conectada.
const PERSONAS: Persona[] = [
  {
    id: 'asesoria',
    label: 'Asesoría / Gestoría',
    Icon: Briefcase,
    examples: [
      {
        prompt: '¿Cuáles son mis facturas pendientes de cobro en marzo?',
        response:
          'He revisado las últimas 30 facturas en Holded para marzo de 2026. Tienes 2 facturas pendientes de cobro por un total de 598,95 € (IVA incluido):\n\n• F0028 — Theta Export Girona SL — 522,72 € — vence 2026-04-09 (Migración de datos)\n• F0024 — Delta Reformas Sevilla SL — 76,23 € — vence 2026-04-05 (Gestión de proyecto)\n\nEl resto (8 facturas, 1.730,50 €) ya están cobradas.',
        capabilities: ['Facturas', 'Contactos'],
      },
      {
        prompt: 'Resume mis cuentas contables y los tipos de IVA configurados en sales.',
        response:
          'Tu Holded tiene el plan de cuentas estándar PGC español. En tipos de IVA de venta activos: 21 %, 10 %, 7,5 %, 5 %, 4 %, 2 %, 0 %, Exenta, No sujeto, Intracomunitario bienes/servicios, Exportación e Inv. Sujeto Pasivo. Las retenciones de venta más usadas son: 19 %, 15 %, 7 % y 5 % garantía de obra.',
        capabilities: ['Cuentas contables', 'Tipos de IVA'],
      },
    ],
  },
  {
    id: 'autonomo',
    label: 'Autónomo / Profesional',
    Icon: User,
    examples: [
      {
        prompt: 'Dame un resumen rápido de qué he facturado esta semana y a quién.',
        response:
          'Esta semana en Holded has emitido 7 facturas por un total de 1.687,00 € (IVA incluido). Top 3 clientes:\n\n• Theta Export Girona SL — 522,72 € — F0028 (Migración de datos)\n• Gamma Studio Valencia SL — 435,60 € — F0023 (Configuración CRM)\n• Iota Construcción Murcia SL — 290,40 € — F0029 (Servicio recurrente mensual)\n\nServicios facturados: consultoría puntual, mantenimiento web, soporte fiscal, formación y adaptación VeriFactu.',
        capabilities: ['Facturas'],
      },
      {
        prompt: 'Prepárame un borrador de factura a Alfa Retail Madrid por 2 horas de consultoría.',
        response:
          'Antes de crear nada, te confirmo los datos del borrador:\n\n• Cliente: Alfa Retail Madrid SL (NIF localizado en Holded)\n• Concepto: Consultoría de gestión empresarial (SKU CONS-001, 150 €/h)\n• Unidades: 2 — Subtotal 300 €\n• IVA 21 %: 63 €\n• Total: 363 €\n\n¿Confirmas para que prepare el borrador? (no se enviará ni se emitirá, queda como borrador en Holded a tu nombre).',
        capabilities: ['Contactos', 'Productos', 'Tipos de IVA', 'Borrador de factura'],
      },
    ],
  },
  {
    id: 'pyme',
    label: 'Pyme / Despacho',
    Icon: Building2,
    examples: [
      {
        prompt: '¿Qué proyectos tengo abiertos y a qué cliente están vinculados?',
        response:
          'Tienes 9 proyectos activos en Holded. Los principales por cliente:\n\n• Auditoría fiscal Gamma 2025 → Gamma Studio Valencia SL\n• Automatización contable Kappa → Kappa Digital Zaragoza SL\n• Servicio mensual Iota → Iota Construcción Murcia SL\n• VeriFactu Delta → Delta Reformas Sevilla SL\n• Proyecto datos Zeta → Zeta Salud Alicante SL\n• Proyecto fiscal Alfa 2025 → Alfa Retail Madrid SL\n\nInternos sin cliente: Cierre trimestral Nova 2025 e Implementación ERP — Construcciones Martínez. Onboarding Holded Beta vinculado a Beta Eventos Barcelona SL.',
        capabilities: ['Proyectos', 'Contactos'],
      },
      {
        prompt: '¿Cómo está mi embudo de ventas y qué leads tengo pendientes?',
        response:
          'Tu CRM en Holded tiene 1 embudo activo ("Embudo 1") con 5 fases: Lead → Contacto establecido → Necesidades definidas → Propuesta realizada → Negociaciones comenzadas. Ahora mismo no hay leads asignados al embudo (0 en cada fase). Si quieres, te genero un plan de captación inicial o te ayudo a importar leads desde un CSV — eso ya lo harías tú desde Holded, el conector es solo lectura por defecto.',
        capabilities: ['CRM', 'Leads'],
      },
    ],
  },
];

function PromptCard({ example, theme, cfgAi }: { example: Example; theme: Theme; cfgAi: string }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Pregunta del usuario */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            Tú
          </span>
          <p className="text-sm leading-6 text-slate-800">{example.prompt}</p>
        </div>
      </div>

      {/* Respuesta de Claude / ChatGPT */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${theme.accentBg} text-[11px] font-bold uppercase tracking-wide ${theme.accentText}`}
          >
            {cfgAi.slice(0, 2)}
          </span>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{example.response}</p>
        </div>

        {/* Capacidades usadas */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <Wrench className="h-3 w-3" />
            Capacidades usadas
          </span>
          {example.capabilities.map((capability) => (
            <code
              key={capability}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            >
              {capability}
            </code>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ConnectorUseCases({
  connector,
  aiName,
}: {
  connector: ConnectorId;
  aiName: string;
}) {
  const theme = THEMES[connector];
  const [active, setActive] = useState<Persona['id']>('asesoria');
  const activePersona = PERSONAS.find((p) => p.id === active) ?? PERSONAS[0];

  return (
    <section className="border-y border-slate-100 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <div
            className={`mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.pill}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Prompts útiles · cuenta demo
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Preguntas que tus usuarios entienden al primer intento.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Ejemplos de uso para asesorías, autónomos y pymes. En una cuenta real, {aiName}
            responde con los datos y permisos disponibles en el Holded conectado.
          </p>
        </div>

        {/* Tabs por persona */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {PERSONAS.map((p) => {
            const isActive = p.id === active;
            const { Icon } = p;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? `${theme.chip} shadow-sm`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Grid de prompts */}
        <div className="grid gap-5 md:grid-cols-2">
          {activePersona.examples.map((ex) => (
            <PromptCard key={ex.prompt} example={ex} theme={theme} cfgAi={aiName} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          <MessageSquareText className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
          En producción, las respuestas se generan desde tu cuenta de Holded. El conector nunca
          accede a otras cuentas y las credenciales no se entregan a la IA.
        </p>
      </div>
    </section>
  );
}
