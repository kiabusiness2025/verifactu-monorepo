/**
 * ConnectorComparison — comparativa visual entre usar Claude / ChatGPT SIN
 * conector (modelo solo, sin acceso a Holded) vs CON conector Holded de
 * Verifactu Business.
 *
 * Objetivo: el visitante que aterriza en la landing entiende en segundos por
 * que el conector convierte una IA generica en una herramienta operativa
 * sobre sus datos reales de Holded.
 *
 * Estructura: tabla side-by-side con 6 escenarios + bloque de cierre con CTA.
 */
'use client';

import { CheckCircle2, ExternalLink, Sparkles, XCircle } from 'lucide-react';
import Link from 'next/link';

type ConnectorId = 'claude' | 'chatgpt';

type Theme = {
  accentText: string;
  accentBg: string;
  pill: string;
  ctaBg: string;
  ctaShadow: string;
  cardBorder: string;
};

type Row = {
  scenario: string;
  withoutConnector: string;
  withConnector: string;
};

const THEMES: Record<ConnectorId, Theme> = {
  claude: {
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    pill: 'border-amber-200 bg-amber-50 text-amber-800',
    ctaBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(217,119,6,0.55)]',
    cardBorder: 'border-amber-200',
  },
  chatgpt: {
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    ctaBg: 'bg-[#10a37f] hover:bg-[#0d8f6f] active:bg-[#0b7a61]',
    ctaShadow: 'shadow-[0_18px_45px_-20px_rgba(16,163,127,0.6)]',
    cardBorder: 'border-emerald-200',
  },
};

function buildRows(aiName: string): Row[] {
  return [
    {
      scenario: '¿Qué facturas tengo pendientes de cobro este mes?',
      withoutConnector: `${aiName} no tiene acceso a tu Holded. Te pide que copies y pegues los datos a mano o que exportes un CSV — y aún así, la respuesta queda limitada al momento del copy/paste.`,
      withConnector: `${aiName} consulta tus facturas en Holded, filtra por estado de pago y te devuelve nombres, importes y vencimientos exactos. Sin copy/paste, sin exportar nada.`,
    },
    {
      scenario: 'Resumir mi cartera de clientes activos',
      withoutConnector: `${aiName} no sabe quiénes son tus clientes. Solo puede dar consejos genéricos sobre segmentación o pedirte que enumeres tú los clientes.`,
      withConnector: `${aiName} lista tu cartera real con NIF, dirección y datos de facturación. Puede segmentar por tipo, ciudad o frecuencia de facturación al vuelo.`,
    },
    {
      scenario: 'Preparar un borrador de factura',
      withoutConnector: `${aiName} puede redactar el texto, pero no crea nada en Holded. Tienes que entrar a Holded, crear la factura manualmente y rellenar todos los campos a mano.`,
      withConnector: `${aiName} prepara el borrador completo con cliente, líneas, IVA y total — y lo crea en tu Holded como borrador tras tu confirmación explícita. Tú revisas y apruebas desde Holded.`,
    },
    {
      scenario: 'Consultar apuntes contables de un periodo',
      withoutConnector: `${aiName} no puede acceder al diario contable. Solo puede explicarte teoría sobre cuentas y asientos, no consultar los tuyos.`,
      withConnector: `${aiName} consulta el diario con rango de fechas para devolverte apuntes filtrados por cuenta o concepto, listos para analizar.`,
    },
    {
      scenario: 'Estado de proyectos abiertos y tareas pendientes',
      withoutConnector: `${aiName} no ve tus proyectos. Te puede ayudar a planificar uno desde cero, pero no a hacer seguimiento de los que ya tienes en marcha.`,
      withConnector: `${aiName} resume proyectos activos, los vincula al cliente correcto e identifica tareas pendientes y horas imputadas.`,
    },
    {
      scenario: 'Embudo CRM y leads por fase',
      withoutConnector: `${aiName} no conoce tu pipeline. Solo puede sugerir frameworks comerciales generales (BANT, MEDDIC) sin datos concretos.`,
      withConnector: `${aiName} devuelve tu embudo real, las fases configuradas y los leads asignados a cada una.`,
    },
  ];
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

export function ConnectorComparison({
  connector,
  aiName,
  connectHref,
}: {
  connector: ConnectorId;
  aiName: string;
  connectHref?: string;
}) {
  const theme = THEMES[connector];
  const rows = buildRows(aiName);

  return (
    <section className="border-y border-slate-100 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <div
            className={`mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.pill}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Con conector vs Sin conector
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            La misma IA. Tus datos de Holded marcan la diferencia.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {aiName} sin conector es un asistente genérico. Con el conector Holded se convierte en
            una herramienta operativa sobre tu contabilidad real, en tiempo real y sin copy/paste.
          </p>
        </div>

        {/* Tabla side-by-side */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Cabecera */}
          <div className="hidden grid-cols-[1.3fr_1fr_1fr] gap-px bg-slate-100 md:grid">
            <div className="bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Escenario
            </div>
            <div className="bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-slate-400" />
                {aiName} sin conector
              </span>
            </div>
            <div
              className={`bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] ${theme.accentText}`}
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {aiName} + conector Holded
              </span>
            </div>
          </div>

          {/* Filas */}
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div
                key={row.scenario}
                className="grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-[1.3fr_1fr_1fr]"
              >
                <div className="bg-white px-5 py-4">
                  <p className="text-sm font-semibold leading-6 text-slate-900">{row.scenario}</p>
                </div>
                <div className="bg-white px-5 py-4 md:bg-slate-50/40">
                  <p className="text-[13px] leading-6 text-slate-500">
                    <span className="md:hidden inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      <XCircle className="h-3 w-3" />
                      Sin conector
                    </span>
                    <span className="md:hidden block" />
                    {row.withoutConnector}
                  </p>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-[13px] leading-6 text-slate-700">
                    <span
                      className={`md:hidden inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.accentText}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Con conector
                    </span>
                    <span className="md:hidden block" />
                    {row.withConnector}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cierre */}
        <div
          className={`mt-10 rounded-2xl border ${theme.cardBorder} bg-gradient-to-br from-white to-slate-50 p-6 text-center shadow-sm sm:p-8`}
        >
          <p className="text-sm leading-7 text-slate-700 sm:text-base">
            <strong className="font-semibold text-slate-950">
              El conector no sustituye a {aiName}.
            </strong>{' '}
            Lo amplía. Mismas respuestas que ya valoras, pero ancladas a tu Holded y con acciones
            auditables — sin exponer tus credenciales a la IA.
          </p>
          {connectHref && (
            <div className="mt-6 flex justify-center">
              {isExternalHref(connectHref) ? (
                <a
                  href={connectHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Conectar gratis · 30 segundos
                </a>
              ) : (
                <Link
                  href={connectHref}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${theme.ctaBg} ${theme.ctaShadow}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Conectar gratis · 30 segundos
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
