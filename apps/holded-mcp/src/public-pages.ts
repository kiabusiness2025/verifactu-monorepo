import {
  NON_GOALS,
  READ_ONLY_TOOL_NAMES,
  TOOL_HUMAN_DESCRIPTIONS,
  WRITE_TOOL_NAMES,
} from './tools/policy.js';

const SUPPORT_EMAIL = 'soporte@verifactu.business';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pageTemplate(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      :root {
        --bg: #f5f5f0;
        --card: #ffffff;
        --text: #111827;
        --muted: #6b7280;
        --accent: #1d9e75;
        --accent-dark: #0f6e56;
        --line: #e5e7eb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #fff6ef 0%, var(--bg) 55%);
        color: var(--text);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 72px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 32px;
        box-shadow: 0 16px 50px rgba(15, 23, 42, 0.06);
      }
      h1, h2, h3 { margin: 0 0 16px; }
      h1 { font-size: 36px; line-height: 1.1; }
      h2 { font-size: 22px; margin-top: 28px; }
      p, li { line-height: 1.7; color: var(--muted); }
      ul { padding-left: 20px; }
      code {
        background: #f3f4f6;
        border-radius: 6px;
        padding: 2px 6px;
        color: #b45309;
      }
      a { color: var(--accent); text-decoration: none; }
      a:hover { color: var(--accent-dark); }
      .hero {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 28px;
      }
      .hero img { width: 52px; height: 52px; object-fit: contain; }
      .grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 18px;
        background: #fcfcfb;
      }
      .pill {
        display: inline-block;
        margin: 0 8px 8px 0;
        padding: 6px 10px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #065f46;
        font-size: 13px;
        font-weight: 600;
      }
      .warning {
        border-left: 4px solid #d97706;
        background: #fff7ed;
        padding: 14px 16px;
        border-radius: 10px;
      }
      .footer-links {
        margin-top: 32px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .demo-label {
        display: inline-block;
        margin-bottom: 16px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #fff7ed;
        color: #b45309;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .examples {
        display: grid;
        gap: 18px;
      }
      .example-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 20px;
        background: linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%);
      }
      .example-card h3 {
        font-size: 18px;
        margin-bottom: 12px;
      }
      .example-card p {
        margin: 0 0 12px;
      }
      .mini-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .metric {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 14px;
        background: #fff;
      }
      .metric strong {
        display: block;
        margin-bottom: 4px;
        color: var(--text);
      }
      .safe-list {
        margin: 12px 0 0;
      }
      @media (max-width: 640px) {
        main { padding: 24px 16px 48px; }
        .card { padding: 24px; }
        h1 { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="card">${body}</div>
    </main>
  </body>
</html>`;
}

export function renderDocsPage(baseUrl: string) {
  const readOnlyTools = READ_ONLY_TOOL_NAMES.map(
    (name) => `<li><code>${name}</code> - ${escapeHtml(TOOL_HUMAN_DESCRIPTIONS[name])}</li>`
  ).join('');
  const writeTools = WRITE_TOOL_NAMES.map(
    (name) => `<li><code>${name}</code> - ${escapeHtml(TOOL_HUMAN_DESCRIPTIONS[name])}</li>`
  ).join('');
  const nonGoals = NON_GOALS.map((goal) => `<li>${escapeHtml(goal)}</li>`).join('');
  const realUsageExamples = renderRealUsageExamplesSection();

  return pageTemplate(
    'Holded MCP Server Documentation',
    `
      <div class="hero">
        <img src="/holded-diamond-logo.png" alt="Holded" />
        <div>
          <h1>Holded MCP Server for Claude</h1>
          <p>Remote HTTPS MCP connector prepared for Claude.ai and Anthropic MCP Directory submission.</p>
        </div>
      </div>

      <div class="grid">
        <section class="panel">
          <h2>Server Overview</h2>
          <p>This server connects Claude to a user's own Holded account through OAuth 2.0 and a user-provided Holded API key.</p>
          <p>MCP endpoint: <code>${escapeHtml(`${baseUrl}/mcp`)}</code></p>
          <p>OAuth metadata: <code>${escapeHtml(`${baseUrl}/.well-known/oauth-authorization-server`)}</code></p>
        </section>
        <section class="panel">
          <h2>Setup in Claude.ai</h2>
          <ol>
            <li>Open Claude.ai connector settings.</li>
            <li>Add a custom connector using <code>${escapeHtml(`${baseUrl}/mcp`)}</code>.</li>
            <li>Let Claude discover OAuth automatically.</li>
            <li>Sign in on the Holded authorization page with your own Holded API key.</li>
          </ol>
        </section>
      </div>

      <h2>Authentication Flow</h2>
      <p>All Holded tools require OAuth 2.0. Unauthenticated requests cannot access Holded data. The authorization page validates the Holded API key before issuing an authorization code. Access tokens are required for every MCP call.</p>

      <h2>Safety Model</h2>
      <p>Most tools are read-only. The only write-capable tool is <code>create_invoice_draft</code>.</p>
      <div class="warning">
        <p><strong>Draft-only invoice creation.</strong> <code>create_invoice_draft</code> creates a draft invoice only. It does not issue, send, pay, delete, finalize, or destructively modify invoices. The user must review the draft in Holded before taking any further action.</p>
      </div>
      <div>
        <span class="pill">Read-only by default</span>
        <span class="pill">No destructive operations</span>
        <span class="pill">No payment execution</span>
        <span class="pill">No money movement</span>
      </div>

      <h2>Exposed Tools</h2>
      <h3>Read-only</h3>
      <ul>${readOnlyTools}</ul>
      <h3>Write-capable</h3>
      <ul>${writeTools}</ul>

      <h2>Non-goals</h2>
      <ul>${nonGoals}</ul>

      ${realUsageExamples}

      <h2>Safety and Permissions</h2>
      <p>Claude.ai exposes per-tool permissions for this connector. The server is read-mostly and keeps the only write-capable path narrow and reviewable.</p>
      <ul class="safe-list">
        <li>Most tools are read-only and used for retrieval, analysis, and artifact generation.</li>
        <li><code>create_invoice_draft</code> is the only write-capable tool and it creates a draft invoice only.</li>
        <li>The connector does not send emails automatically, execute payments, transfer money, delete records, or finalize accounting entries.</li>
        <li>If Claude helps prepare an email message or a Gmail draft, that remains user-controlled communication outside money movement.</li>
      </ul>

      <h2>Submission Notes</h2>
      <p>These public examples are based on tested Claude.ai workflows but use demo data. They help MCP Directory review because they show realistic value, preserve the read-mostly boundary, and avoid any claim of autonomous payment, money movement, destructive action, or cross-service automation.</p>

      <h2>Troubleshooting</h2>
      <ul>
        <li>If Claude does not connect, remove the connector and add it again using the same MCP URL.</li>
        <li>If authorization fails, verify that the Holded API key is still valid and has the required Holded permissions.</li>
        <li>If Google or Claude still show an old icon, wait for external cache refresh after deployment.</li>
        <li>If token exchange fails after deployment, confirm the production environment has the canonical <code>BASE_URL</code> and valid OAuth secrets.</li>
      </ul>

      <h2>Support and Legal</h2>
      <p>Support contact: <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a></p>
      <div class="footer-links">
        <a href="https://holded.verifactu.business/claude">Canonical docs</a>
        <a href="https://holded.verifactu.business/privacy">Privacy Policy</a>
        <a href="https://holded.verifactu.business/dpa">DPA</a>
        <a href="/support">Support</a>
      </div>
    `
  );
}

function renderRealUsageExamplesSection() {
  return `
      <h2>Real usage examples</h2>
      <span class="demo-label">Demo data based on tested Claude.ai workflows.</span>
      <div class="examples">
        <section class="example-card">
          <h3>1. Invoice PDF + email draft</h3>
          <p>User asks: <code>Sí, y muéstrame factura en PDF para descargar</code></p>
          <p>Claude can retrieve the invoice details from Holded and generate a downloadable PDF artifact named <code>Factura costa azul</code>. If the user also wants a message around the invoice, Claude can help draft the text, but any Gmail draft or send action remains user-controlled and is not money movement.</p>
          <div class="mini-grid">
            <div class="metric">
              <strong>Issuer</strong>
              Nova Gestión · CIF B03000001
            </div>
            <div class="metric">
              <strong>Customer</strong>
              Arrendataria Costa Azul SL · Lucía Pastor
            </div>
            <div class="metric">
              <strong>Invoice</strong>
              FAC-2025-0043 · 31/12/2025
            </div>
            <div class="metric">
              <strong>Total</strong>
              2722.50 EUR
            </div>
          </div>
          <ul class="safe-list">
            <li>Drafting an email is optional and user-controlled.</li>
            <li>The connector does not send invoices or move money automatically.</li>
          </ul>
        </section>

        <section class="example-card">
          <h3>2. Holded dashboard HTML</h3>
          <p>Claude can explain that it creates sales invoice drafts for review and can extract supplier, date, amount, VAT breakdown, and concept from uploaded expense documents.</p>
          <div class="mini-grid">
            <div class="metric"><strong>Facturación total</strong>45050 EUR</div>
            <div class="metric"><strong>Gastos registrados</strong>4367 EUR</div>
            <div class="metric"><strong>Beneficio estimado</strong>40683 EUR</div>
            <div class="metric"><strong>Facturas emitidas</strong>11</div>
          </div>
          <p>Monthly mock data can show January to April 2026 sales, expenses, and profit, plus donut breakdowns by customer and service type.</p>
        </section>

        <section class="example-card">
          <h3>3. Annual financial summary + Q1 comparison</h3>
          <p>User asks: <code>Sí y crea Resumen 2025 y una comparativa (ventas, gastos y beneficio) del 1 trimestre en dashboard 2025 vs 2026</code></p>
          <ul class="safe-list">
            <li>Q1 2025: sales 10250, expenses 2500, profit 7750, margin 75.6%</li>
            <li>Q1 2026: sales 20100, expenses 4367, profit 15733, margin 78.3%</li>
            <li>Full year 2025: sales 36700, expenses 9387, profit 27313, margin 74.4%</li>
          </ul>
          <p>Claude can narrate the comparison in plain language: Q1 2026 nearly doubles Q1 2025 sales, profit more than doubles, expenses rise but margin still improves.</p>
        </section>

        <section class="example-card">
          <h3>4. Financial report PDF</h3>
          <p>Claude can turn Holded data into a PDF artifact named <code>Informe financiero 2025</code> with KPI cards, quarterly charts, and a service-level P&amp;L view.</p>
          <div class="mini-grid">
            <div class="metric"><strong>Ventas totales</strong>36700 EUR</div>
            <div class="metric"><strong>Gastos totales</strong>9387 EUR</div>
            <div class="metric"><strong>Beneficio neto</strong>27313 EUR</div>
            <div class="metric"><strong>Margen</strong>74.4%</div>
          </div>
          <p>This is analytical output for human review. It is not an accounting posting or destructive action.</p>
        </section>

        <section class="example-card">
          <h3>5. P&amp;L 2025 natural language summary</h3>
          <p>User asks: <code>Hazme un resumen de PyG en 2025</code></p>
          <p>Claude can retrieve Holded financial data, filter it to 2025, summarize the P&amp;L, highlight that net margin is 74%, identify Q1 as the best quarter, and note that AWS plus Microsoft 365 make up over half of operating costs.</p>
          <p>Claude can then offer a comparison against 2026 or an export to PDF or Word.</p>
        </section>
      </div>
  `;
}

export function renderPrivacyPage() {
  return pageTemplate(
    'Holded MCP Privacy Policy',
    `
      <h1>Privacy Policy</h1>
      <p>This page describes the privacy commitments for the Holded MCP connector operated by Verifactu Business.</p>
      <ul>
        <li>The connector uses the Holded API key provided by the user only to access that user's Holded account.</li>
        <li>The connector is designed to expose mostly read-only tools plus draft-only invoice creation.</li>
        <li>Holded API keys and OAuth session data must be handled as confidential credentials.</li>
        <li>Users can disconnect the connector and revoke access tokens.</li>
      </ul>
      <p>If you need help with privacy or data removal related to this connector, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
      <div class="footer-links">
        <a href="/docs">Connector docs</a>
        <a href="/terms">Terms of Service</a>
      </div>
    `
  );
}

export function renderTermsPage() {
  return pageTemplate(
    'Holded MCP Terms of Service',
    `
      <h1>Terms of Service</h1>
      <p>These terms apply to the Holded MCP connector exposed at <code>/mcp</code>.</p>
      <ul>
        <li>The service is intended to connect Claude with the user's own Holded account.</li>
        <li>The connector does not provide money movement, payment execution, crypto operations, or destructive automation.</li>
        <li>The user remains responsible for reviewing any draft invoice before issuing or sending it from Holded.</li>
        <li>Access may be limited or revoked to protect security, prevent abuse, or maintain service integrity.</li>
      </ul>
      <p>For questions about these terms, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
      <div class="footer-links">
        <a href="/docs">Connector docs</a>
        <a href="/privacy">Privacy Policy</a>
      </div>
    `
  );
}

export function renderSupportPage() {
  return pageTemplate(
    'Holded MCP Support',
    `
      <h1>Support</h1>
      <p>If you need help with the Holded MCP connector, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
      <ul>
        <li>Include the connector URL you used in Claude.ai.</li>
        <li>Include the exact error message and the step where it happened.</li>
        <li>Do not send your Holded API key in plain text.</li>
      </ul>
      <div class="footer-links">
        <a href="/docs">Connector docs</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </div>
    `
  );
}
