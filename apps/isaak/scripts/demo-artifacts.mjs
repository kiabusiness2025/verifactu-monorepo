/**
 * demo-artifacts.mjs
 *
 * Genera mocks visuales reales de Isaak Artifacts usando la API de Holded demo.
 * Salida: scripts/output/
 *   - dashboard.html   (Chart.js — 4 gráficos interactivos)
 *   - informe.docx     (Word con tablas de datos)
 *
 * Uso (desde apps/isaak):
 *   node scripts/demo-artifacts.mjs
 */

import { createWriteStream, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'output');
mkdirSync(OUT, { recursive: true });

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY  = '0ecf1267eacc89ff45acab1b8ca28396';
const BASE_URL = 'https://api.holded.com';

// Periodo: Jan 2024 – today (para tener datos suficientes)
const FROM_DATE = '2024-01-01';
const TO_DATE   = new Date().toISOString().slice(0, 10);

// ── Holded fetch ──────────────────────────────────────────────────────────────

async function hFetch(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { key: API_KEY, Accept: 'application/json', 'Accept-Encoding': 'identity' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Holded ${res.status} at ${path}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

function toUnix(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

async function listDocs(docType) {
  const qs = new URLSearchParams({
    starttmp: String(toUnix(FROM_DATE)),
    endtmp:   String(toUnix(TO_DATE)),
  });
  const raw = await hFetch(`/api/invoicing/v1/documents/${docType}?${qs}`);
  return Array.isArray(raw) ? raw : [];
}

// ── Normalise Holded doc → ledger row ─────────────────────────────────────────

function unixToDate(unix) {
  if (typeof unix !== 'number' || unix <= 0) return null;
  return new Date(unix * 1000);
}

function toNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isFinite(n) ? n : 0; }
  return 0;
}

function normDoc(doc, isExpense) {
  const date = unixToDate(doc.date);
  if (!date) return null;
  const contact = doc.contact ?? null;
  return {
    entryDate:       date,
    amount:          toNum(doc.total),
    taxBase:         toNum(doc.subtotal ?? doc.total),
    vatAmount:       toNum(doc.tax ?? 0),
    counterpartyName: (contact?.name ?? doc.contactName ?? '').trim() || (isExpense ? 'Proveedor' : 'Cliente'),
    docType:         isExpense ? 'invoice_in' : 'invoice_out',
  };
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

function toYearMonth(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function quarterLabel(d) {
  return `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}
function sortQuarters(a, b) {
  const [qa, ya] = a.split(' ');
  const [qb, yb] = b.split(' ');
  const yd = Number(ya) - Number(yb);
  return yd !== 0 ? yd : qa.localeCompare(qb);
}
function fmtEur(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function round2(n) { return Math.round(n * 100) / 100; }

// ── Build datasets ────────────────────────────────────────────────────────────

function buildSalesByMonth(outRows) {
  const byMonth = new Map();
  for (const r of outRows) {
    const k = toYearMonth(r.entryDate);
    byMonth.set(k, (byMonth.get(k) ?? 0) + r.amount);
  }
  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  return {
    labels:   sorted.map(([k]) => k),
    values:   sorted.map(([, v]) => round2(v)),
    tableRows: sorted.map(([k, v]) => [k, fmtEur(v)]),
    tableHeaders: ['Mes', 'Ventas (€)'],
    summary: `Total ventas: ${fmtEur(total)} € · ${sorted.length} meses · periodo ${FROM_DATE} – ${TO_DATE}`,
    total,
  };
}

function buildExpenseBreakdown(inRows) {
  const bySupplier = new Map();
  for (const r of inRows) {
    const k = r.counterpartyName || 'Sin nombre';
    bySupplier.set(k, (bySupplier.get(k) ?? 0) + r.amount);
  }
  const sorted = [...bySupplier.entries()].sort(([, a], [, b]) => b - a);
  const top8 = sorted.slice(0, 8);
  const rest = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top8.push(['Otros', rest]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  return {
    labels:   top8.map(([k]) => k),
    values:   top8.map(([, v]) => round2(v)),
    tableRows: top8.map(([k, v]) => [k, fmtEur(v), total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%']),
    tableHeaders: ['Proveedor', 'Importe (€)', '%'],
    summary: `Total gastos: ${fmtEur(total)} € · ${sorted.size ?? sorted.length} proveedores`,
    total,
  };
}

function buildCashFlow(outRows, inRows) {
  const months = new Set();
  const inc = new Map(), exp = new Map();
  for (const r of outRows) { const k = toYearMonth(r.entryDate); months.add(k); inc.set(k, (inc.get(k) ?? 0) + r.amount); }
  for (const r of inRows)  { const k = toYearMonth(r.entryDate); months.add(k); exp.set(k, (exp.get(k) ?? 0) + r.amount); }
  const sorted = [...months].sort();
  const totalInc = sorted.reduce((s, m) => s + (inc.get(m) ?? 0), 0);
  const totalExp = sorted.reduce((s, m) => s + (exp.get(m) ?? 0), 0);
  return {
    labels:    sorted,
    ingresos:  sorted.map(m => round2(inc.get(m) ?? 0)),
    gastos:    sorted.map(m => round2(exp.get(m) ?? 0)),
    tableRows: sorted.map(m => {
      const i = inc.get(m) ?? 0, e = exp.get(m) ?? 0;
      return [m, fmtEur(i), fmtEur(e), fmtEur(i - e)];
    }),
    tableHeaders: ['Mes', 'Ingresos (€)', 'Gastos (€)', 'Flujo neto (€)'],
    summary: `Ingresos: ${fmtEur(totalInc)} € | Gastos: ${fmtEur(totalExp)} € | Neto: ${fmtEur(totalInc - totalExp)} €`,
    totalInc, totalExp,
  };
}

function buildIvaTrimestral(outRows, inRows) {
  const quarters = new Set();
  const dev = new Map(), sop = new Map();
  for (const r of outRows) { const k = quarterLabel(r.entryDate); quarters.add(k); dev.set(k, (dev.get(k) ?? 0) + r.vatAmount); }
  for (const r of inRows)  { const k = quarterLabel(r.entryDate); quarters.add(k); sop.set(k, (sop.get(k) ?? 0) + r.vatAmount); }
  const sorted = [...quarters].sort(sortQuarters);
  const totalDev = sorted.reduce((s, q) => s + (dev.get(q) ?? 0), 0);
  const totalSop = sorted.reduce((s, q) => s + (sop.get(q) ?? 0), 0);
  const res = totalDev - totalSop;
  return {
    labels:     sorted,
    devengado:  sorted.map(q => round2(dev.get(q) ?? 0)),
    soportado:  sorted.map(q => round2(sop.get(q) ?? 0)),
    tableRows:  sorted.map(q => {
      const d = dev.get(q) ?? 0, s = sop.get(q) ?? 0;
      return [q, fmtEur(d), fmtEur(s), fmtEur(d - s)];
    }),
    tableHeaders: ['Trimestre', 'IVA devengado (€)', 'IVA soportado (€)', 'Resultado (€)'],
    summary: `Devengado: ${fmtEur(totalDev)} € | Soportado: ${fmtEur(totalSop)} € | Resultado: ${fmtEur(res)} € (${res > 0 ? 'a ingresar' : res < 0 ? 'a devolver' : 'neutro'})`,
    totalDev, totalSop, resultado: res,
  };
}

// ── HTML Generator ────────────────────────────────────────────────────────────

const COLORS = ['#2361d8','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];

function tableHtml(headers, rows, caption) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map((row, ri) =>
    `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">${row.map(c => `<td>${c}</td>`).join('')}</tr>`
  ).join('\n');
  return `
    <table>
      <caption>${caption}</caption>
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
}

function buildHtml(salesByMonth, expBreakdown, cashFlow, ivaQ) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Isaak Artifacts — Demo Visual (Nova Gestión)</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #f8faff; color: #1e293b; padding: 32px 24px; }
  h1   { font-size: 22px; font-weight: 700; color: #0b2060; margin-bottom: 4px; }
  .meta { font-size: 13px; color: #64748b; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0;
           box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 20px; }
  .card-title  { font-size: 14px; font-weight: 600; color: #0b2060; margin-bottom: 2px; }
  .card-label  { font-size: 11px; color: #94a3b8; margin-bottom: 16px; }
  .summary     { margin-top: 14px; font-size: 12px; color: #1e40af; background: #eff6ff;
                 border-left: 3px solid #2361d8; padding: 10px 12px; border-radius: 0 8px 8px 0; }
  table        { width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 14px; }
  caption      { font-size: 11px; color: #94a3b8; text-align: left; margin-bottom: 6px; }
  th           { background: #0b2060; color: #fff; padding: 6px 10px; text-align: left; font-weight: 600; }
  td           { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; }
  tr.even      { background: white; }
  tr.odd       { background: #f8faff; }
  canvas       { max-height: 260px; }
  .isaak-badge { display: inline-flex; align-items: center; gap: 6px; background: #0b2060;
                  color: white; font-size: 12px; font-weight: 600; padding: 6px 14px;
                  border-radius: 20px; margin-bottom: 8px; }
  footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>

<div class="isaak-badge">📊 Isaak</div>
<h1>Panel de Informes — Nova Gestión</h1>
<p class="meta">Datos reales via Holded API · Periodo ${FROM_DATE} – ${TO_DATE} · Generado ${new Date().toLocaleDateString('es-ES')}</p>

<div class="grid">

  <!-- Ventas por mes -->
  <div class="card">
    <div class="card-title">📈 Ventas por mes</div>
    <div class="card-label">Facturas emitidas agrupadas mensualmente</div>
    <canvas id="salesChart"></canvas>
    <div class="summary">${salesByMonth.summary}</div>
    ${tableHtml(salesByMonth.tableHeaders, salesByMonth.tableRows, 'Detalle mensual')}
  </div>

  <!-- Desglose de gastos -->
  <div class="card">
    <div class="card-title">🥧 Desglose de gastos</div>
    <div class="card-label">Top proveedores por volumen de compra</div>
    <canvas id="expChart"></canvas>
    <div class="summary">${expBreakdown.summary}</div>
    ${tableHtml(expBreakdown.tableHeaders, expBreakdown.tableRows, 'Top proveedores')}
  </div>

  <!-- Flujo de caja -->
  <div class="card">
    <div class="card-title">📉 Flujo de caja</div>
    <div class="card-label">Ingresos vs gastos por mes</div>
    <canvas id="cashChart"></canvas>
    <div class="summary">${cashFlow.summary}</div>
    ${tableHtml(cashFlow.tableHeaders, cashFlow.tableRows, 'Detalle mensual')}
  </div>

  <!-- IVA trimestral -->
  <div class="card">
    <div class="card-title">🧾 IVA trimestral</div>
    <div class="card-label">IVA devengado vs soportado por trimestre</div>
    <canvas id="ivaChart"></canvas>
    <div class="summary">${ivaQ.summary}</div>
    ${tableHtml(ivaQ.tableHeaders, ivaQ.tableRows, 'Detalle trimestral')}
  </div>

</div>

<footer>Generado por Isaak · verifactu.business · Demo artifact panel</footer>

<script>
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
Chart.defaults.font.size = 11;

// Ventas por mes — bar
new Chart(document.getElementById('salesChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(salesByMonth.labels)},
    datasets: [{ label: 'Ventas (€)', data: ${JSON.stringify(salesByMonth.values)},
      backgroundColor: '#2361d8', borderRadius: 4 }]
  },
  options: { responsive: true, plugins: { legend: { display: false } },
             scales: { y: { ticks: { callback: v => v.toLocaleString('es-ES') + ' €' } } } }
});

// Desglose gastos — pie
new Chart(document.getElementById('expChart'), {
  type: 'pie',
  data: {
    labels: ${JSON.stringify(expBreakdown.labels)},
    datasets: [{ data: ${JSON.stringify(expBreakdown.values)},
      backgroundColor: ${JSON.stringify(COLORS.slice(0, expBreakdown.labels.length))} }]
  },
  options: { responsive: true, plugins: {
    legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } },
    tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw.toLocaleString('es-ES') + ' €' } }
  }}
});

// Flujo de caja — line
new Chart(document.getElementById('cashChart'), {
  type: 'line',
  data: {
    labels: ${JSON.stringify(cashFlow.labels)},
    datasets: [
      { label: 'Ingresos', data: ${JSON.stringify(cashFlow.ingresos)},
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',
        fill: true, tension: 0.3, pointRadius: 3 },
      { label: 'Gastos',   data: ${JSON.stringify(cashFlow.gastos)},
        borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)',
        fill: true, tension: 0.3, pointRadius: 3 }
    ]
  },
  options: { responsive: true, plugins: { legend: { position: 'top' } },
             scales: { y: { ticks: { callback: v => v.toLocaleString('es-ES') + ' €' } } } }
});

// IVA trimestral — bar grouped
new Chart(document.getElementById('ivaChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(ivaQ.labels)},
    datasets: [
      { label: 'Devengado', data: ${JSON.stringify(ivaQ.devengado)},
        backgroundColor: '#2361d8', borderRadius: 4 },
      { label: 'Soportado', data: ${JSON.stringify(ivaQ.soportado)},
        backgroundColor: '#10b981', borderRadius: 4 }
    ]
  },
  options: { responsive: true, plugins: { legend: { position: 'top' } },
             scales: { y: { ticks: { callback: v => v.toLocaleString('es-ES') + ' €' } } } }
});
<\/script>
</body>
</html>`;
}

// ── DOCX Generator ────────────────────────────────────────────────────────────

async function generateDocx(salesByMonth, expBreakdown, cashFlow, ivaQ) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, AlignmentType, HeadingLevel, BorderStyle,
  } = await import('docx');

  const HEADER_SHADE = { fill: '0B2060', type: 'clear', color: 'FFFFFF' };
  const ROW_SHADE_ALT = { fill: 'F0F4FF', type: 'clear' };

  function makeTable(headers, rows) {
    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({
        shading: HEADER_SHADE,
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.LEFT })],
      })),
    });
    const dataRows = rows.map((row, ri) =>
      new TableRow({
        children: row.map(cell => new TableCell({
          shading: ri % 2 === 1 ? ROW_SHADE_ALT : undefined,
          children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18 })] })],
        })),
      })
    );
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });
  }

  function section(title, summary, headers, rows) {
    return [
      new Paragraph({ text: title, heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: summary, italics: true, color: '1E3A8A', size: 18 })],
        spacing: { after: 160 } }),
      makeTable(headers, rows),
    ];
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Panel de Informes — Nova Gestión', bold: true, size: 32, color: '0B2060' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Datos Holded · Periodo ${FROM_DATE} – ${TO_DATE} · Generado ${new Date().toLocaleDateString('es-ES')}`, size: 18, color: '64748B' })],
          spacing: { after: 400 },
        }),
        ...section('Ventas por mes', salesByMonth.summary, salesByMonth.tableHeaders, salesByMonth.tableRows),
        ...section('Desglose de gastos', expBreakdown.summary, expBreakdown.tableHeaders, expBreakdown.tableRows),
        ...section('Flujo de caja', cashFlow.summary, cashFlow.tableHeaders, cashFlow.tableRows),
        ...section('IVA trimestral', ivaQ.summary, ivaQ.tableHeaders, ivaQ.tableRows),
        new Paragraph({ children: [new TextRun({ text: 'Generado por Isaak · verifactu.business', size: 16, color: '94A3B8' })],
          spacing: { before: 600 }, alignment: AlignmentType.CENTER }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Conectando con Holded API demo...');
  console.log(`   Periodo: ${FROM_DATE} → ${TO_DATE}\n`);

  let invoices, purchases;
  try {
    [invoices, purchases] = await Promise.all([
      listDocs('invoice'),
      listDocs('purchase'),
    ]);
  } catch (err) {
    console.error('❌ Error al llamar Holded API:', err.message);
    process.exit(1);
  }

  console.log(`✅ Holded API OK`);
  console.log(`   Facturas de venta: ${invoices.length}`);
  console.log(`   Gastos/compras:    ${purchases.length}\n`);

  const outRows = invoices.map(d => normDoc(d, false)).filter(Boolean);
  const inRows  = purchases.map(d => normDoc(d, true)).filter(Boolean);

  if (outRows.length === 0 && inRows.length === 0) {
    console.warn('⚠️  Sin datos en el periodo. Comprueba que la empresa demo tiene documentos.');
    process.exit(0);
  }

  console.log('📊 Calculando datasets...');
  const salesByMonth  = buildSalesByMonth(outRows);
  const expBreakdown  = buildExpenseBreakdown(inRows);
  const cashFlow      = buildCashFlow(outRows, inRows);
  const ivaQ          = buildIvaTrimestral(outRows, inRows);

  // Print summary
  console.log('\n── Resumen ──────────────────────────────────────────');
  console.log(`   ${salesByMonth.summary}`);
  console.log(`   ${expBreakdown.summary}`);
  console.log(`   ${cashFlow.summary}`);
  console.log(`   ${ivaQ.summary}`);
  console.log('──────────────────────────────────────────────────────\n');

  // HTML
  console.log('🌐 Generando dashboard.html...');
  const html = buildHtml(salesByMonth, expBreakdown, cashFlow, ivaQ);
  const htmlPath = join(OUT, 'dashboard.html');
  await writeFile(htmlPath, html, 'utf-8');
  console.log(`   → ${htmlPath}`);

  // DOCX
  console.log('📝 Generando informe.docx...');
  const docxBuf = await generateDocx(salesByMonth, expBreakdown, cashFlow, ivaQ);
  const docxPath = join(OUT, 'informe.docx');
  await writeFile(docxPath, docxBuf);
  console.log(`   → ${docxPath}`);

  console.log('\n✨ Listo. Abre dashboard.html en el navegador para ver los gráficos.');
  console.log('   (Para PDF: abre dashboard.html → Ctrl+P → Guardar como PDF)\n');
}

main().catch(err => { console.error(err); process.exit(1); });
