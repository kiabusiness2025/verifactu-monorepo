const SUPPORT_EMAIL = 'soporte@verifactu.business';
const HOLDED_BASE = 'https://holded.verifactu.business/conectores/claude';
const CONNECT_URL =
  'https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Holded&connectorUrl=https%3A%2F%2Fclaude.verifactu.business%2Fmcp';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CAPABILITIES = [
  {
    icon: '🧾',
    title: 'Facturas',
    sub: 'Lista facturas recientes y consulta el detalle de cualquier factura existente.',
    ex: ['¿Cuánto he facturado este mes?', 'Enséñame las últimas facturas de un cliente.'],
  },
  {
    icon: '👥',
    title: 'Contactos',
    sub: 'Revisa contactos y datos disponibles sin crear ni modificar registros.',
    ex: ['Busca los datos fiscales de este cliente.', '¿Qué contactos tienen facturas pendientes?'],
  },
  {
    icon: '🏦',
    title: 'Cuentas contables',
    sub: 'Consulta el plan de cuentas y resume códigos, nombres y tipos cuando existan.',
    ex: ['Resume mis principales cuentas contables.', '¿Dónde se concentra el gasto?'],
  },
  {
    icon: '📖',
    title: 'Diario contable',
    sub: 'Lee apuntes existentes solo cuando se indique fecha inicial y final.',
    ex: ['Muéstrame los apuntes de marzo.', 'Explícame este asiento en lenguaje claro.'],
  },
  {
    icon: '📝',
    title: 'Borradores de factura',
    sub: 'Prepara borradores solo después de confirmación explícita del usuario.',
    ex: ['Prepara un borrador para Acme por 100 € + IVA.', 'Pídeme confirmación antes de crearlo.'],
  },
  {
    icon: '📦',
    title: 'Productos y stock',
    sub: 'Lista catálogo, ficha de producto y stock disponible cuando está habilitado.',
    ex: ['¿Qué productos tengo con stock bajo?', 'Enséñame precio y stock de este SKU.'],
  },
  {
    icon: '📋',
    title: 'Proyectos y tareas',
    sub: 'Consulta proyectos abiertos, tareas pendientes e imputaciones de horas.',
    ex: ['Resume mis proyectos activos.', '¿Qué tareas están pendientes esta semana?'],
  },
  {
    icon: '📈',
    title: 'CRM: leads y embudo',
    sub: 'Visualiza el embudo de ventas y los leads asignados sin modificar nada.',
    ex: ['Resume mi embudo por fases.', '¿Qué leads esperan seguimiento?'],
  },
  {
    icon: '⬇️',
    title: 'PDFs de documentos',
    sub: 'Descarga el PDF de una factura, presupuesto o albarán existente.',
    ex: [
      'Dame el PDF de la última factura de este cliente.',
      'Recupera el presupuesto que necesito adjuntar.',
    ],
  },
  {
    icon: '💼',
    title: 'Equipo y tesorería',
    sub: 'Empleados, cuentas de tesorería, tipos de IVA, almacenes y series de numeración.',
    ex: [
      'Muéstrame mi equipo y cuentas de tesorería.',
      'Lista almacenes y series antes de crear un borrador.',
    ],
  },
];

const TRUST_POINTS = [
  'Solo accede a la cuenta de Holded conectada por el usuario autenticado.',
  'Credenciales protegidas en servidores de Verifactu; no se muestran a la IA ni al cliente.',
  'Solo lectura por defecto; crear un borrador de factura requiere confirmación explícita.',
  'No envía, emite, cobra, finaliza, elimina ni sobrescribe facturas o registros existentes.',
];

export function renderLandingPage(_baseUrl: string) {
  const connectHref = escapeHtml(CONNECT_URL);
  const holdedBase = escapeHtml(HOLDED_BASE);

  const capsHtml = CAPABILITIES.map(
    (cap) => `
      <article class="cap-card">
        <span class="cap-icon">${cap.icon}</span>
        <h3>${escapeHtml(cap.title)}</h3>
        <p class="cap-sub">${escapeHtml(cap.sub)}</p>
        <div class="cap-examples">
          ${cap.ex.map((e) => `<span class="example-chip">${escapeHtml(e)}</span>`).join('\n          ')}
        </div>
      </article>`
  ).join('');

  const trustHtml = TRUST_POINTS.map(
    (t) => `
      <li>
        <span class="check-icon">&#10003;</span>
        <span>${escapeHtml(t)}</span>
      </li>`
  ).join('');

  const mailtoHref = `mailto:${escapeHtml(SUPPORT_EMAIL)}?subject=Soporte%20conector%20Holded%20para%20Claude`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pregunta a Holded desde Claude | Verifactu Business</title>
  <meta name="description" content="Conecta Holded con Claude para consultar facturas, contactos, contabilidad, CRM y proyectos en lenguaje natural. Borradores de factura solo con confirmación." />
  <link rel="icon" type="image/png" href="/holded-diamond-logo.png" sizes="64x64" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/holded-diamond-logo.png" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --amber:       #d97706;
      --amber-d:     #b45309;
      --amber-bg:    rgba(255,251,235,0.55);
      --amber-bdr:   #fde68a;
      --chip-bg:     #fef9ee;
      --chip-txt:    #92400e;
      --text:        #0f172a;
      --text-mid:    #374151;
      --text-muted:  #64748b;
      --bdr:         #e2e8f0;
      --bdr-xs:      #f1f5f9;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: var(--text);
      background: #fff;
      line-height: 1.5;
    }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }

    .w    { max-width: 72rem; margin: 0 auto; padding: 0 1.25rem; }
    .w-md { max-width: 48rem; margin: 0 auto; padding: 0 1.25rem; }

    /* ── Hero ───────────────────────────────── */
    .hero {
      background: linear-gradient(175deg, #fff 0%, #fff7ed 100%);
      border-bottom: 1px solid var(--bdr);
      padding: 4rem 0 5rem;
      text-align: center;
    }
    .logo-pair {
      display: inline-flex;
      align-items: center;
      gap: .75rem;
      margin-bottom: 1.5rem;
    }
    .logo-box {
      width: 3rem; height: 3rem;
      border-radius: 14px;
      border: 1px solid var(--bdr);
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .logo-box img { width: 2rem; height: 2rem; object-fit: contain; }
    .logo-plus { font-size: 1.1rem; color: #cbd5e1; font-weight: 300; }

    .chip {
      display: inline-flex; align-items: center; gap: .375rem;
      padding: .375rem .875rem;
      border-radius: 9999px;
      font-size: .7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .16em;
      border: 1px solid var(--amber-bdr);
      background: var(--chip-bg); color: var(--chip-txt);
    }
    .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; margin-bottom: .875rem; }

    .hero h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700; letter-spacing: -.02em; line-height: 1.06;
      color: var(--text); margin: 1.75rem 0 1.25rem;
    }
    .hero .desc {
      max-width: 38rem; margin: 0 auto 2.25rem;
      font-size: 1.0625rem; line-height: 1.75; color: var(--text-mid);
    }
    .btns { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; margin-bottom: 1.75rem; }

    .btn-p {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .875rem 1.75rem; border-radius: 9999px;
      font-size: .875rem; font-weight: 600; color: #fff;
      background: var(--amber); border: none;
      text-decoration: none; transition: background .15s;
      box-shadow: 0 18px 45px -20px rgba(217,119,6,.55);
    }
    .btn-p:hover { background: var(--amber-d); }

    .btn-s {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .875rem 1.75rem; border-radius: 9999px;
      font-size: .875rem; font-weight: 600; color: var(--text);
      background: #fff; border: 1px solid var(--bdr);
      text-decoration: none; transition: background .15s;
    }
    .btn-s:hover { background: #f8fafc; }

    .trust-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem; }
    .trust-chip {
      padding: .25rem .75rem; border-radius: 9999px;
      font-size: .75rem; font-weight: 500;
      border: 1px solid var(--amber-bdr);
      background: var(--chip-bg); color: var(--chip-txt);
    }

    /* ── Sections ───────────────────────────── */
    .sec       { padding: 4rem 0; }
    .sec-amber {
      background: var(--amber-bg);
      border-top: 1px solid var(--bdr-xs);
      border-bottom: 1px solid var(--bdr-xs);
    }
    .sec-head  { text-align: center; margin-bottom: 2.5rem; }
    .sec-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .18em; color: var(--text-muted); }
    .sec-title {
      font-size: clamp(1.5rem, 3vw, 1.875rem);
      font-weight: 700; letter-spacing: -.015em; color: var(--text);
      margin: .75rem 0;
    }
    .sec-sub {
      color: var(--text-muted); font-size: .9375rem;
      line-height: 1.7; max-width: 38rem; margin: 0 auto;
    }

    /* ── Steps ──────────────────────────────── */
    .steps-head {
      display: flex; flex-wrap: wrap; gap: 1rem;
      align-items: flex-end; justify-content: space-between;
      margin-bottom: 2rem;
    }
    .steps-head-left { flex: 1; min-width: 200px; }
    .steps-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

    .step-card {
      background: #fff; border: 1px solid var(--bdr);
      border-radius: 14px; padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .step-n { font-size: .7rem; font-weight: 700; letter-spacing: .2em; color: #cbd5e1; }
    .icon-box {
      width: 2.25rem; height: 2.25rem; margin: .75rem 0;
      border-radius: 10px; background: var(--chip-bg);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
    }
    .step-card h3 { font-size: .9375rem; font-weight: 700; color: var(--text); margin-bottom: .5rem; }
    .step-card p  { font-size: .875rem; line-height: 1.65; color: var(--text-muted); }

    .step-note {
      margin-top: 1.25rem;
      display: flex; align-items: flex-start; gap: .5rem;
      background: #fff; border: 1px solid var(--bdr);
      border-radius: 12px; padding: .75rem 1rem;
      font-size: .75rem; color: var(--text-muted);
    }
    .step-note-icon { color: var(--amber); flex-shrink: 0; font-weight: 700; }

    /* ── Capabilities ───────────────────────── */
    .cap-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    .cap-card {
      display: flex; flex-direction: column;
      min-height: 16rem; padding: 1.25rem;
      background: #fff; border: 1px solid var(--bdr);
      border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .cap-icon { font-size: 1.25rem; margin-bottom: 1rem; }
    .cap-card h3  { font-size: .9rem; font-weight: 700; color: var(--text); margin-bottom: .375rem; }
    .cap-sub      { font-size: .8125rem; line-height: 1.6; color: var(--text-muted); flex: 1; }
    .cap-examples { margin-top: 1rem; display: flex; flex-direction: column; gap: .375rem; }
    .example-chip {
      display: block; padding: .375rem .625rem;
      background: #f8fafc; border-radius: 6px;
      font-size: .7rem; font-weight: 500; line-height: 1.5; color: #475569;
    }

    /* ── Security ───────────────────────────── */
    .security-grid { display: grid; gap: 1.5rem; }
    @media (min-width: 900px) { .security-grid { grid-template-columns: 1fr 0.9fr; } }
    .trust-list {
      list-style: none; background: #fff;
      border: 1px solid var(--bdr); border-radius: 10px;
      overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .trust-list li {
      display: flex; align-items: flex-start; gap: .75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--bdr-xs);
    }
    .trust-list li:last-child { border-bottom: none; }
    .check-icon { color: var(--amber); flex-shrink: 0; margin-top: 2px; font-weight: 700; }
    .trust-list li span:last-child { font-size: .875rem; line-height: 1.65; color: var(--text-mid); }

    /* ── How it works ───────────────────────── */
    .how-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .how-card {
      background: #fff; border: 1px solid var(--bdr);
      border-radius: 10px; padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .how-n { font-size: .7rem; font-weight: 700; letter-spacing: .2em; color: #cbd5e1; }
    .how-card h3 { font-size: .9375rem; font-weight: 700; color: var(--text); margin-bottom: .5rem; }
    .how-card p  { font-size: .875rem; line-height: 1.65; color: var(--text-muted); }

    /* ── Support ────────────────────────────── */
    .support-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .support-card {
      display: flex; flex-direction: column;
      background: #fff; border: 1px solid var(--bdr);
      border-radius: 10px; padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      text-decoration: none;
      transition: border-color .15s, background .15s;
    }
    .support-card:hover { border-color: #fbbf24; background: #fffbeb; }
    .support-card h3 { font-size: .9375rem; font-weight: 700; color: var(--text); margin: 1rem 0 .5rem; }
    .support-card p  { font-size: .875rem; line-height: 1.65; color: var(--text-muted); flex: 1; }
    .support-more {
      margin-top: 1rem;
      display: inline-flex; align-items: center; gap: .25rem;
      font-size: .875rem; font-weight: 600; color: var(--amber);
    }

    /* ── Footer CTA ─────────────────────────── */
    .footer-cta { padding: 3.5rem 0; text-align: center; }
    .footer-badge {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .25rem .75rem; border-radius: 9999px;
      border: 1px solid var(--bdr); background: #fff;
      font-size: .75rem; font-weight: 600; color: var(--text-muted);
      margin-bottom: 1.25rem;
    }
    .footer-cta h2 { font-size: 1.5rem; font-weight: 700; letter-spacing: -.015em; margin-bottom: .75rem; }
    .footer-cta .desc { max-width: 28rem; font-size: .9375rem; }
    .footer-links { margin-top: 2rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.25rem; }
    .footer-links a { font-size: .75rem; font-weight: 500; color: var(--text-muted); }
    .footer-links a:hover { color: var(--text); text-decoration: underline; text-underline-offset: 2px; }

    /* ── Hero Mock ──────────────────────────────── */
    .hero-mock {
      margin: 2.5rem auto 0;
      max-width: 860px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 24px 64px -20px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04);
      overflow: hidden;
      text-align: left;
    }
    .mock-chrome {
      display: flex; align-items: center; gap: .5rem;
      padding: .5rem .875rem;
      background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
    }
    .mock-dots { display: flex; gap: .35rem; }
    .mock-dot  { width: .575rem; height: .575rem; border-radius: 50%; }
    .mock-dot-r { background: #fc625d; }
    .mock-dot-y { background: #fdbc40; }
    .mock-dot-g { background: #35cd4b; }
    .mock-url {
      flex: 1; margin: 0 .5rem;
      padding: .2rem .625rem; border-radius: 5px;
      background: #fff; border: 1px solid #e2e8f0;
      font-size: .625rem; color: #64748b; text-align: center;
    }
    .mock-split { display: flex; min-height: 300px; }

    .mock-chat {
      width: 42%; background: #212121;
      padding: 1rem; display: flex; flex-direction: column; gap: .625rem; overflow: hidden;
    }
    .msg {
      max-width: 90%; padding: .5rem .75rem; border-radius: 10px;
      font-size: .6875rem; line-height: 1.55;
      opacity: 0; animation: msgIn .4s ease forwards;
    }
    .msg-u { background: #3d3d3d; color: #e5e5e5; align-self: flex-end; border-bottom-right-radius: 3px; }
    .msg-a { background: #2d2d2d; color: #d1d5db; align-self: flex-start; border-bottom-left-radius: 3px; }
    .m1 { animation-delay: .4s; }
    .m2 { animation-delay: 1.4s; }
    .m3 { animation-delay: 2.8s; }
    .m4 { animation-delay: 4.0s; }
    .msg-chip {
      display: inline-flex; align-items: center; gap: .3rem;
      margin-top: .45rem; padding: .275rem .5rem;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14);
      border-radius: 6px; font-size: .6rem; color: #94a3b8;
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .mock-dash { width: 58%; background: #fff; padding: 1rem; overflow: hidden; }
    .mock-dash-head { font-size: .6875rem; font-weight: 700; color: #374151; margin-bottom: .625rem; }
    .kpi-row { display: flex; gap: .5rem; margin-bottom: .75rem; }
    .kpi {
      flex: 1; padding: .5rem .625rem;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    }
    .kpi-lbl { font-size: .5625rem; color: #64748b; font-weight: 500; }
    .kpi-val { font-size: .8125rem; font-weight: 700; color: #0f172a; margin-top: .1rem; }
    .chart-head {
      font-size: .5625rem; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .1em; margin-bottom: .375rem;
    }
    .donuts-row { display: flex; gap: .875rem; margin-top: .625rem; }
    .donut-wrap { flex: 1; }
    .donut-head { font-size: .5625rem; font-weight: 600; color: #374151; margin-bottom: .3rem; }
    .donut-lgd  { display: grid; grid-template-columns: 1fr 1fr; gap: .15rem .4rem; margin-top: .3rem; }
    .lgd-item   { display: flex; align-items: center; gap: .2rem; font-size: .5rem; color: #64748b; }
    .lgd-dot    { width: .35rem; height: .35rem; border-radius: 50%; flex-shrink: 0; }

    /* ── Responsive ─────────────────────────── */
    @media (max-width: 760px) { .hero-mock { display: none; } }
    @media (max-width: 640px) {
      .hero { padding: 3rem 0 4rem; }
      .cap-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .btn-p, .btn-s { padding: .75rem 1.25rem; }
      .steps-head { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>

<!-- ── HERO ───────────────────────────────────── -->
<section class="hero">
  <div class="w">
    <div class="logo-pair">
      <div class="logo-box">
        <img src="/holded-diamond-logo.png" alt="Holded" width="32" height="32" />
      </div>
      <span class="logo-plus">+</span>
      <div class="logo-box">
        <img src="/claude.svg" alt="Claude" width="32" height="32" />
      </div>
    </div>

    <div class="chips">
      <span class="chip">&#10022; Acceso gratuito durante lanzamiento</span>
    </div>
    <div class="chips">
      <span class="chip">&#10022; Conector Holded para Claude</span>
    </div>

    <h1>Pregunta a Holded desde Claude.</h1>

    <p class="desc">
      Consulta facturas, contactos, contabilidad, CRM y proyectos en lenguaje natural.
      Crea borradores de factura solo con confirmación explícita. Tus credenciales se
      guardan en servidor y el acceso queda limitado a tu cuenta conectada.
    </p>

    <div class="btns">
      <a href="${connectHref}" target="_blank" rel="noopener noreferrer" class="btn-p">
        &#10230; Conectar Holded con Claude
      </a>
      <a href="${holdedBase}/demo" class="btn-s">&#9654; Ver demo</a>
      <a href="${holdedBase}/docs" class="btn-s">Cómo conectar &#8594;</a>
      <a href="${holdedBase}/soporte" class="btn-s">Soporte</a>
    </div>

    <div class="trust-chips">
      <span class="trust-chip">Solo lectura por defecto</span>
      <span class="trust-chip">Borradores con confirmación</span>
      <span class="trust-chip">Cuenta conectada</span>
      <span class="trust-chip">Credenciales en servidor</span>
    </div>

    <p style="margin-top:1.25rem;font-size:.75rem;color:#94a3b8;">Disponible en acceso controlado</p>

    <div class="hero-mock">
      <div class="mock-chrome">
        <div class="mock-dots">
          <span class="mock-dot mock-dot-r"></span>
          <span class="mock-dot mock-dot-y"></span>
          <span class="mock-dot mock-dot-g"></span>
        </div>
        <div class="mock-url">claude.ai/new</div>
      </div>
      <div class="mock-split">
        <div class="mock-chat">
          <div class="msg msg-u m1">&#191;Cu&#225;nto hemos facturado en 2026 y c&#243;mo van los gastos?</div>
          <div class="msg msg-a m2">
            He consultado Holded. Resumen 2026:<br/>
            Ventas&nbsp;<b style="color:#86efac">39.300&nbsp;&#8364;</b> &middot;
            Gastos&nbsp;<b style="color:#fde68a">9.387&nbsp;&#8364;</b> &middot;
            Margen&nbsp;<b style="color:#6ee7b7">76&nbsp;%</b><br/>
            El gasto m&#225;s alto es suministros&nbsp;(31&nbsp;%). Beneficio creciendo desde marzo.
          </div>
          <div class="msg msg-u m3">Genera un dashboard con la evoluci&#243;n mensual</div>
          <div class="msg msg-a m4">
            &#161;Listo! Dashboard generado.<br/>
            <span class="msg-chip">&#128196; Holded dashboard &middot; HTML</span>
          </div>
        </div>
        <div class="mock-dash">
          <div class="mock-dash-head">Holded dashboard &middot; 2026</div>
          <div class="kpi-row">
            <div class="kpi">
              <div class="kpi-lbl">Ventas</div>
              <div class="kpi-val" style="color:#16a34a">39.300&nbsp;&#8364;</div>
            </div>
            <div class="kpi">
              <div class="kpi-lbl">Gastos</div>
              <div class="kpi-val">9.387&nbsp;&#8364;</div>
            </div>
            <div class="kpi">
              <div class="kpi-lbl">Margen</div>
              <div class="kpi-val" style="color:#d97706">76&nbsp;%</div>
            </div>
          </div>
          <div class="chart-head">Evoluci&#243;n mensual (&#8364;)</div>
          <svg viewBox="0 0 440 128" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
            <line x1="32" y1="16" x2="432" y2="16" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="32" y1="42" x2="432" y2="42" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="32" y1="68" x2="432" y2="68" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="32" y1="94" x2="432" y2="94" stroke="#f1f5f9" stroke-width="1"/>
            <text x="28" y="19" font-size="8" fill="#94a3b8" text-anchor="end">12k</text>
            <text x="28" y="45" font-size="8" fill="#94a3b8" text-anchor="end">9k</text>
            <text x="28" y="71" font-size="8" fill="#94a3b8" text-anchor="end">6k</text>
            <text x="28" y="97" font-size="8" fill="#94a3b8" text-anchor="end">3k</text>
            <rect x="48" y="26" width="32" height="87" rx="3" fill="#10b981"/>
            <rect x="82" y="92" width="20" height="21" rx="2" fill="#f87171"/>
            <text x="73" y="124" font-size="8" fill="#94a3b8" text-anchor="middle">Ene</text>
            <rect x="146" y="32" width="32" height="81" rx="3" fill="#10b981"/>
            <rect x="180" y="95" width="20" height="18" rx="2" fill="#f87171"/>
            <text x="171" y="124" font-size="8" fill="#94a3b8" text-anchor="middle">Feb</text>
            <rect x="244" y="38" width="32" height="75" rx="3" fill="#10b981"/>
            <rect x="278" y="91" width="20" height="22" rx="2" fill="#f87171"/>
            <text x="269" y="124" font-size="8" fill="#94a3b8" text-anchor="middle">Mar</text>
            <rect x="342" y="20" width="32" height="93" rx="3" fill="#10b981"/>
            <rect x="376" y="88" width="20" height="25" rx="2" fill="#f87171"/>
            <text x="367" y="124" font-size="8" fill="#94a3b8" text-anchor="middle">Abr</text>
            <polyline points="64,47 162,51 260,58 358,40" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,2"/>
            <circle cx="64" cy="47" r="3" fill="#3b82f6"/>
            <circle cx="162" cy="51" r="3" fill="#3b82f6"/>
            <circle cx="260" cy="58" r="3" fill="#3b82f6"/>
            <circle cx="358" cy="40" r="3" fill="#3b82f6"/>
          </svg>
          <div class="donuts-row">
            <div class="donut-wrap">
              <div class="donut-head">Por cliente</div>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:72px;height:72px;display:block">
                <circle cx="50" cy="50" r="30" fill="none" stroke="#10b981" stroke-width="14" stroke-dasharray="66 122.5" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#3b82f6" stroke-width="14" stroke-dasharray="47.1 141.4" transform="rotate(36 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#a78bfa" stroke-width="14" stroke-dasharray="37.7 150.8" transform="rotate(126 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#fb923c" stroke-width="14" stroke-dasharray="37.7 150.8" transform="rotate(198 50 50)"/>
              </svg>
              <div class="donut-lgd">
                <span class="lgd-item"><span class="lgd-dot" style="background:#10b981"></span>Tech Madrid</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#3b82f6"></span>El Patio</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#a78bfa"></span>Tech BCN</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#fb923c"></span>Otros</span>
              </div>
            </div>
            <div class="donut-wrap">
              <div class="donut-head">Por servicio</div>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:72px;height:72px;display:block">
                <circle cx="50" cy="50" r="30" fill="none" stroke="#10b981" stroke-width="14" stroke-dasharray="75.4 113.1" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" stroke-width="14" stroke-dasharray="47.1 141.4" transform="rotate(54 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#f59e0b" stroke-width="14" stroke-dasharray="37.7 150.8" transform="rotate(144 50 50)"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#3b82f6" stroke-width="14" stroke-dasharray="28.3 160.2" transform="rotate(216 50 50)"/>
              </svg>
              <div class="donut-lgd">
                <span class="lgd-item"><span class="lgd-dot" style="background:#10b981"></span>Desarrollo</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#ef4444"></span>ERP</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#f59e0b"></span>Consultor&#237;a</span>
                <span class="lgd-item"><span class="lgd-dot" style="background:#3b82f6"></span>Licencias</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── PASOS ──────────────────────────────────── -->
<section class="sec sec-amber">
  <div class="w">
    <div class="steps-head">
      <div class="steps-head-left">
        <span class="chip" style="margin-bottom:.875rem;">&#10022; Disponible ahora como conector personalizado</span>
        <p class="sec-label" style="margin-top:.875rem;">Conectar en 3 pasos</p>
        <h2 class="sec-title" style="text-align:left;margin-top:.5rem;">
          Añade Holded a Claude en menos de dos minutos.
        </h2>
        <p style="font-size:.875rem;line-height:1.6;color:var(--text-muted);max-width:30rem;margin-top:.5rem;">
          El conector usa el flujo de conector personalizado de Claude mientras finaliza la
          revisión en el directorio oficial de Anthropic. Ya está operativo.
        </p>
      </div>
      <a href="${connectHref}" target="_blank" rel="noopener noreferrer" class="btn-p">
        &#10230; Conectar Holded con Claude
      </a>
    </div>

    <div class="steps-grid">
      <div class="step-card">
        <span class="step-n">01</span>
        <div class="icon-box">&#128279;</div>
        <h3>Pulsa el botón &ldquo;Añadir a Claude&rdquo;</h3>
        <p>Claude.ai abre el diálogo de conector personalizado con Holded ya preconfigurado — nombre y URL del servidor MCP rellenados automáticamente.</p>
      </div>
      <div class="step-card">
        <span class="step-n">02</span>
        <div class="icon-box">&#9889;</div>
        <h3>Confirma en Claude</h3>
        <p>Revisa el nombre "Holded" y la URL del servidor. Haz clic en "Añadir conector" para iniciar el flujo de autorización.</p>
      </div>
      <div class="step-card">
        <span class="step-n">03</span>
        <div class="icon-box">&#128273;</div>
        <h3>Autoriza con tu API key de Holded</h3>
        <p>La pantalla segura de Verifactu solicita tu API key de Holded. Se guarda en servidor y no se devuelve a Claude ni al navegador.</p>
      </div>
    </div>

    <div class="step-note">
      <span class="step-note-icon">&#10003;</span>
      <span>
        Si ya tienes cuenta en Verifactu Business, el flujo detecta tu sesión activa y omite
        el paso de registro. La autorización se completa en segundos.
      </span>
    </div>
  </div>
</section>

<!-- ── CAPACIDADES ────────────────────────────── -->
<section class="sec">
  <div class="w">
    <div class="sec-head">
      <p class="sec-label">Capacidades actuales</p>
      <h2 class="sec-title">Preguntas de negocio, no menús.</h2>
      <p class="sec-sub">
        Estas son las capacidades actuales del conector. El usuario pregunta en lenguaje
        natural y Claude consulta Holded dentro de la cuenta autorizada.
      </p>
    </div>
    <div class="cap-grid">${capsHtml}</div>
    <div style="margin-top:2.5rem;display:flex;justify-content:center;">
      <a href="${connectHref}" target="_blank" rel="noopener noreferrer" class="btn-p">
        &#10230; Conectar Holded con Claude
      </a>
    </div>
  </div>
</section>

<!-- ── SEGURIDAD ──────────────────────────────── -->
<section class="sec sec-amber">
  <div class="w">
    <div class="security-grid">
      <div>
        <p class="sec-label">Seguridad y alcance</p>
        <h2 class="sec-title" style="text-align:left;margin-top:.75rem;">
          Solo lectura por defecto.<br/>Borradores con confirmación.
        </h2>
        <p style="margin-top:1rem;font-size:.9375rem;line-height:1.75;color:var(--text-muted);">
          El conector está diseñado para un alcance cerrado y reproducible. No cambia de
          cuenta, no muestra credenciales, no envía facturas y no realiza acciones contables
          amplias de forma autónoma.
        </p>
      </div>
      <ul class="trust-list">${trustHtml}</ul>
    </div>
  </div>
</section>

<!-- ── CÓMO FUNCIONA ──────────────────────────── -->
<section class="sec">
  <div class="w">
    <div class="sec-head">
      <p class="sec-label">Cómo funciona</p>
      <h2 class="sec-title">El mismo flujo base para Claude y futuras integraciones.</h2>
    </div>
    <div class="how-grid">
      <div class="how-card">
        <span class="how-n">01</span>
        <div class="icon-box" style="width:2.5rem;height:2.5rem;margin:.75rem 0;font-size:1.25rem;">&#128218;</div>
        <h3>Inicia la conexión</h3>
        <p>Empieza desde Claude o desde el acceso directo de Verifactu. Solo necesitas tu API key de Holded y una cuenta autorizada.</p>
      </div>
      <div class="how-card">
        <span class="how-n">02</span>
        <div class="icon-box" style="width:2.5rem;height:2.5rem;margin:.75rem 0;font-size:1.25rem;">&#128274;</div>
        <h3>Autoriza Holded</h3>
        <p>Verifactu valida la API key y guarda la conexión en servidor. Las credenciales no se devuelven a Claude ni al navegador.</p>
      </div>
      <div class="how-card">
        <span class="how-n">03</span>
        <div class="icon-box" style="width:2.5rem;height:2.5rem;margin:.75rem 0;font-size:1.25rem;">&#128172;</div>
        <h3>Pregunta con control</h3>
        <p>Claude consulta datos de Holded dentro de la cuenta conectada. Las acciones de borrador requieren confirmación antes de ejecutarse.</p>
      </div>
    </div>
  </div>
</section>

<!-- ── SOPORTE ─────────────────────────────────── -->
<section class="sec sec-amber">
  <div class="w">
    <div class="sec-head">
      <p class="sec-label">Soporte</p>
      <h2 class="sec-title">Tres vías de contacto, separadas y claras.</h2>
    </div>
    <div class="support-grid">
      <a href="https://holded.verifactu.business/support/chat?source=claude_connector"
         target="_blank" rel="noopener noreferrer" class="support-card">
        <div class="icon-box">&#128172;</div>
        <h3>Chat de soporte</h3>
        <p>Ayuda guiada en una ventana independiente, sin incrustar chats dentro de la landing.</p>
        <span class="support-more">Abrir chat &#8594;</span>
      </a>
      <a href="${holdedBase}/soporte" class="support-card">
        <div class="icon-box">&#128203;</div>
        <h3>Formulario autenticado</h3>
        <p>Usuarios registrados pueden abrir un ticket vinculado a su cuenta conectada y enviar contexto al equipo.</p>
        <span class="support-more">Abrir soporte &#8594;</span>
      </a>
      <a href="${mailtoHref}" class="support-card">
        <div class="icon-box">&#9993;</div>
        <h3>Email directo</h3>
        <p>Para incidencias urgentes o con adjuntos, escribe a soporte@verifactu.business.</p>
        <span class="support-more">Enviar email &#8594;</span>
      </a>
    </div>
  </div>
</section>

<!-- ── FOOTER CTA ──────────────────────────────── -->
<section class="footer-cta">
  <div class="w-md">
    <div class="footer-badge">
      &#10003; Operado por Verifactu Business &mdash; no por Anthropic ni Holded
    </div>
    <h2>Conecta Holded con Claude.</h2>
    <p class="desc" style="margin:0 auto .5rem;">
      Autoriza el conector en segundos. Solo lectura por defecto; los borradores requieren
      confirmación explícita antes de crearse.
    </p>
    <div class="btns" style="margin-top:1.75rem;">
      <a href="${connectHref}" target="_blank" rel="noopener noreferrer" class="btn-p">
        &#10230; Conectar Holded con Claude
      </a>
      <a href="${holdedBase}/demo" class="btn-s">&#9654; Ver demo</a>
      <a href="${holdedBase}/docs" class="btn-s">Documentación</a>
    </div>
    <div class="footer-links">
      <a href="${holdedBase}/docs">Docs</a>
      <a href="${holdedBase}/privacy">Privacidad</a>
      <a href="${holdedBase}/dpa">DPA</a>
      <a href="${holdedBase}/soporte">Soporte</a>
      <a href="${holdedBase}/terms">Términos</a>
    </div>
  </div>
</section>

</body>
</html>`;
}
