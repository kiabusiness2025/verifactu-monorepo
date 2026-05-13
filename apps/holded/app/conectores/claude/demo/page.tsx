import { ExternalLink, Sparkles, VideoIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Demo Conector Holded para Claude | Verifactu Business',
  description:
    'Demo del conector Holded para Claude: conexion segura con OAuth + PKCE, consulta de facturas, contactos, contabilidad y borrador con confirmacion explicita. 24 ejemplos en video.',
  alternates: { canonical: '/conectores/claude/demo' },
};

const INTRO_YOUTUBE_URL = 'https://www.youtube.com/embed/A1SCtziMpd0';
const INTRO_LOCAL_VIDEO_URL = '/video/holded-claude-intro.mp4';
const OUTRO_YOUTUBE_URL = '';
const OUTRO_LOCAL_VIDEO_URL = '/video/holded-claude-outro.mp4';

type GifCategory = {
  slug: string;
  title: string;
  blurb: string;
  gifs: Array<{
    title: string;
    tool: string;
    description: string;
    src?: string;
  }>;
};

// Roadmap de los 24 GIFs ordenados por valor comercial.
// Sin `src` se renderiza como placeholder con el titulo + tool.
// Cuando tengamos los GIFs grabados desde Nova Gestion, anadimos `src: '/gif/holded-claude/<slug>.gif'`.
const GIF_CATEGORIES: GifCategory[] = [
  {
    slug: 'visualizaciones',
    title: '1. Visualizaciones e interpretacion',
    blurb: 'Tablas, graficos y resumenes generados por Claude a partir de datos reales de Holded.',
    gifs: [
      {
        title: 'Resumen mensual de facturacion',
        tool: 'list_documents + get_document',
        description: 'Top clientes, evolucion mes a mes y outliers detectados automaticamente.',
      },
      {
        title: 'Comparativa trimestral',
        tool: 'list_documents (rango fechas)',
        description: 'Q3 vs Q4 con variacion % por categoria de producto.',
      },
      {
        title: 'Distribucion de gastos',
        tool: 'get_chart_of_accounts + get_journal',
        description: 'Pie chart de partidas y deteccion de gastos atipicos.',
      },
      {
        title: 'Embudo CRM visual',
        tool: 'list_crm_funnels + list_leads',
        description: 'Funnel con conversiones por etapa y leads en riesgo.',
      },
    ],
  },
  {
    slug: 'fiscal',
    title: '2. Interpretacion fiscal y contable',
    blurb: 'Claude traduce contabilidad y obligaciones fiscales a lenguaje natural.',
    gifs: [
      {
        title: 'IVA acumulado del trimestre',
        tool: 'list_documents + list_taxes',
        description: 'Calculo aproximado de IVA repercutido vs soportado.',
      },
      {
        title: 'Que falta para cerrar el trimestre',
        tool: 'list_documents (filtro estado)',
        description: 'Facturas pendientes, gastos sin categorizar, conciliaciones.',
      },
      {
        title: 'Resumen para asesoria',
        tool: 'multi-tool',
        description: 'Documento listo para enviar a tu asesor con todo lo relevante.',
      },
      {
        title: 'Apuntes contables del mes',
        tool: 'get_daily_book',
        description: 'Diario contable de un rango de fechas en formato legible.',
      },
    ],
  },
  {
    slug: 'invoice-status',
    title: '3. Estado de facturas y cobros',
    blurb: 'Cuales estan pagadas, vencidas, en riesgo de impago o duplicadas.',
    gifs: [
      {
        title: 'Facturas vencidas',
        tool: 'list_documents (filtro estado)',
        description: 'Listado de facturas pendientes de cobro con dias de retraso.',
      },
      {
        title: 'Top 10 clientes morosos',
        tool: 'list_documents + list_contacts',
        description: 'Ranking por importe pendiente y antiguedad.',
      },
      {
        title: 'Detectar duplicadas',
        tool: 'list_documents',
        description: 'Posibles facturas duplicadas por cliente y fecha.',
      },
      {
        title: 'Recordatorios sugeridos',
        tool: 'list_documents + draft de email',
        description: 'Claude redacta el email de cobro (no lo envia).',
      },
    ],
  },
  {
    slug: 'pdfs',
    title: '4. Generacion y descarga de PDFs',
    blurb: 'Claude obtiene el PDF de una factura, presupuesto o albaran existente.',
    gifs: [
      {
        title: 'PDF de factura para cliente',
        tool: 'get_document_pdf',
        description: 'Descarga el PDF de la ultima factura emitida a un cliente.',
      },
      {
        title: 'PDF para adjuntar a email',
        tool: 'get_document_pdf',
        description: 'Localiza la factura por importe + fecha y obtiene el PDF.',
      },
      {
        title: 'PDF de presupuesto',
        tool: 'get_document_pdf (estimate)',
        description: 'Recupera el PDF de un presupuesto Q-2026-XXX.',
      },
      {
        title: 'Lote de PDFs por cliente',
        tool: 'list_documents + get_document_pdf',
        description: 'Todas las facturas de un cliente del trimestre en PDF.',
      },
    ],
  },
  {
    slug: 'automation',
    title: '5. Automatizacion de gastos y borradores',
    blurb: 'Borradores de factura preparados por Claude, siempre con confirmacion explicita.',
    gifs: [
      {
        title: 'Borrador de factura simple',
        tool: 'create_invoice_draft',
        description: 'Cliente existente + concepto + importe. Confirmacion antes de crear.',
      },
      {
        title: 'Borrador con varias lineas',
        tool: 'create_invoice_draft',
        description: 'Tres conceptos con IVA distinto. Claude pide confirmar antes.',
      },
      {
        title: 'Borrador en serie por cliente',
        tool: 'create_invoice_draft + list_contacts',
        description: 'Tres clientes con misma plantilla. Cada uno requiere confirmacion.',
      },
      {
        title: 'Categorizacion de gasto',
        tool: 'get_chart_of_accounts',
        description: 'Sugiere cuenta contable para un gasto basandose en concepto.',
      },
    ],
  },
  {
    slug: 'core',
    title: '6. Operaciones nucleo',
    blurb: 'Las 4 GIFs imprescindibles que validan el alcance basico del conector.',
    gifs: [
      {
        title: 'Conexion inicial OAuth',
        tool: 'flujo de autorizacion',
        description: 'Activacion del conector desde Claude.ai con OAuth + PKCE.',
      },
      {
        title: 'Lista de productos',
        tool: 'list_products',
        description: 'Catalogo con stock disponible cuando esta habilitado.',
      },
      {
        title: 'Proyectos abiertos',
        tool: 'list_projects + list_project_tasks',
        description: 'Tareas pendientes esta semana por proyecto.',
      },
      {
        title: 'Equipo y roles',
        tool: 'list_employees',
        description: 'Empleados, departamentos y puestos.',
      },
    ],
  },
];

function VideoBlock({
  youtubeUrl,
  localUrl,
  title,
}: {
  youtubeUrl: string;
  localUrl: string;
  title: string;
}) {
  if (youtubeUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-amber-200">
        <iframe
          src={youtubeUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-amber-200 bg-slate-950">
      <video controls playsInline preload="metadata" className="h-full w-full">
        <source src={localUrl} type="video/mp4" />
        Tu navegador no soporta la reproduccion de video.
      </video>
    </div>
  );
}

function GifPlaceholder({
  title,
  tool,
  description,
  src,
}: {
  title: string;
  tool: string;
  description: string;
  src?: string;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md">
      <div className="aspect-video w-full overflow-hidden rounded-md border border-slate-100 bg-slate-50">
        {src ? (
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              GIF en preparacion
            </span>
          </div>
        )}
      </div>
      <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
      <code className="mt-1 block text-[11px] text-amber-700">{tool}</code>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </article>
  );
}

export default function ClaudeDemoPage() {
  // B6 hardening (auditoría 2026-05-11): mismo cleanup que /chatgpt/demo,
  // sólo renderizamos los GIFs con src real para evitar placeholders al reviewer.
  const visibleCategories = GIF_CATEGORIES.map((cat) => ({
    ...cat,
    gifs: cat.gifs.filter((g) => Boolean(g.src)),
  })).filter((cat) => cat.gifs.length > 0);
  const totalGifs = visibleCategories.reduce((acc, cat) => acc + cat.gifs.length, 0);
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-16">
        {/* HERO */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-200">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Holded"
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </div>
            <span className="text-[22px] font-bold text-slate-900">+</span>
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src="/brand/claude-logo.svg"
                alt="Claude"
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            <VideoIcon className="h-3.5 w-3.5" />
            Demo Conector Claude · {totalGifs} ejemplos
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Conector Holded para Claude — Demo en video
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Todo el flujo del conector en accion: conexion segura con OAuth + PKCE, consulta de
            datos en lenguaje natural y borradores que requieren confirmacion explicita. {totalGifs}{' '}
            GIFs cortos organizados por valor comercial.
          </p>
        </div>

        {/* INTRO VIDEO */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
              Intro
            </span>
            <span className="text-xs text-slate-500">El conector en 60 segundos</span>
          </div>
          <VideoBlock
            youtubeUrl={INTRO_YOUTUBE_URL}
            localUrl={INTRO_LOCAL_VIDEO_URL}
            title="Intro Conector Holded para Claude"
          />
        </section>

        {/* GIFS GRID — solo categorías con material real grabado */}
        {visibleCategories.map((cat) => (
          <section key={cat.slug} id={cat.slug} className="mt-12 scroll-mt-20">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">{cat.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{cat.blurb}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {cat.gifs.map((gif) => (
                <GifPlaceholder
                  key={gif.title}
                  title={gif.title}
                  tool={gif.tool}
                  description={gif.description}
                  src={gif.src}
                />
              ))}
            </div>
          </section>
        ))}

        {/* OUTRO VIDEO — solo si hay material real grabado */}
        {(OUTRO_YOUTUBE_URL ||
          (OUTRO_LOCAL_VIDEO_URL &&
            !OUTRO_LOCAL_VIDEO_URL.includes('/video/holded-claude-outro.mp4'))) && (
          <section className="mt-12">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                Outro
              </span>
              <span className="text-xs text-slate-500">Pasos siguientes</span>
            </div>
            <VideoBlock
              youtubeUrl={OUTRO_YOUTUBE_URL}
              localUrl={OUTRO_LOCAL_VIDEO_URL}
              title="Outro Conector Holded para Claude"
            />
          </section>
        )}

        {/* STATS */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ['Protocolo', 'MCP Streamable HTTP'],
            ['Auth', 'OAuth 2.0 + PKCE + DCR'],
            ['Escritura', 'Solo con confirmacion'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        {/* CTAS */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Holded&connectorUrl=https%3A%2F%2Fclaude.verifactu.business%2Fmcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <ExternalLink className="h-4 w-4" />
            Conectar en Claude.ai
          </a>
          <Link
            href="/conectores/claude"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver pagina del conector
          </Link>
          <Link
            href="/conectores/claude/docs"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Documentacion
          </Link>
          <Link
            href="/conectores/claude/soporte"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Soporte
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Desarrollado por{' '}
          <a
            href="https://verifactu.business"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Expert Estudios Profesionales, SLU — Verifactu Business
          </a>{' '}
          · Holded Solution Partner
        </p>
      </div>
    </main>
  );
}
