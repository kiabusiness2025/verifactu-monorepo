const SUPPORT_EMAIL = 'soporte@verifactu.business';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pageTemplateClaude(title: string, body: string, theme: 'light' | 'dark' = 'light') {
  const isDark = theme === 'dark';
  const bgGradient = isDark
    ? 'radial-gradient(circle at top, #1a1a2e 0%, #16213e 55%)'
    : 'radial-gradient(circle at top, #f0f4ff 0%, #ffffff 55%)';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/png" href="/holded-diamond-logo.png" sizes="64x64" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/holded-diamond-logo.png" />
    <link rel="manifest" href="/manifest.json" />
    <style>
      :root {
        --bg: ${isDark ? '#0f172a' : '#ffffff'};
        --card: ${isDark ? '#1e293b' : '#ffffff'};
        --text: ${isDark ? '#f1f5f9' : '#1e293b'};
        --muted: ${isDark ? '#cbd5e1' : '#64748b'};
        --accent: #0066ff;
        --accent-dark: #0052cc;
        --line: ${isDark ? '#334155' : '#e2e8f0'};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: ${bgGradient};
        color: var(--text);
      }
      main {
        max-width: 1000px;
        margin: 0 auto;
        padding: 64px 24px 80px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      }
      h1, h2, h3 { margin: 0 0 16px; }
      h1 { font-size: 40px; line-height: 1.1; font-weight: 700; }
      h2 { font-size: 24px; margin-top: 32px; font-weight: 600; }
      p, li { line-height: 1.7; color: var(--muted); }
      ul { padding-left: 20px; }
      code {
        background: ${isDark ? '#334155' : '#f0f4ff'};
        border-radius: 6px;
        padding: 2px 6px;
        color: var(--accent);
        font-family: 'Monaco', 'Courier New', monospace;
      }
      a { color: var(--accent); text-decoration: none; font-weight: 500; }
      a:hover { color: var(--accent-dark); }
      .hero {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 40px;
      }
      .hero img { width: 64px; height: 64px; object-fit: contain; }
      .grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 20px;
        background: ${isDark ? '#0f172a' : '#f8fafc'};
      }
      .pill {
        display: inline-block;
        margin: 0 8px 8px 0;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(0, 102, 255, 0.1);
        color: var(--accent);
        font-size: 13px;
        font-weight: 600;
      }
      .warning {
        border-left: 4px solid var(--accent);
        background: rgba(0, 102, 255, 0.05);
        padding: 16px 18px;
        border-radius: 12px;
      }
      .footer-links {
        margin-top: 40px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .mockup-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin: 24px 0;
      }
      .mockup-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      }
      .mockup-card img {
        width: 100%;
        height: auto;
        display: block;
      }
      @media (max-width: 640px) {
        main { padding: 32px 16px 48px; }
        .card { padding: 20px; }
        h1 { font-size: 28px; }
        .mockup-grid { grid-template-columns: 1fr; }
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

export function renderLandingPage(baseUrl: string) {
  return pageTemplateClaude(
    'Claude + Holded Connector — MCP Server',
    `
      <div class="hero">
        <img src="/claude.svg" alt="Claude" />
        <div>
          <h1>Claude + Holded Connector</h1>
          <p>Connect your Holded account to Claude. Ask questions about your business, generate reports, and create invoice drafts — all directly in Claude.ai.</p>
        </div>
      </div>

      <div class="grid">
        <section class="panel">
          <h2>🚀 Get Started</h2>
          <ol style="padding-left: 20px;">
            <li>Get your Holded API key</li>
            <li>Add custom MCP connector to Claude</li>
            <li>Authorize with your API key</li>
            <li>Start asking questions</li>
          </ol>
          <a href="/docs" style="display: inline-block; margin-top: 12px; padding: 10px 16px; background: var(--accent); color: white; border-radius: 8px; text-decoration: none;">Full Setup Guide</a>
        </section>
        <section class="panel">
          <h2>💼 What You Can Do</h2>
          <ul>
            <li>Query your Holded data in natural language</li>
            <li>Generate financial reports (PDF)</li>
            <li>Create invoice drafts for review</li>
            <li>Analyze sales, costs, and profit</li>
            <li>Compare quarterly results</li>
          </ul>
        </section>
      </div>

      <div style="margin-top: 48px;">
        <h2>Real Usage Examples</h2>
        <p>See how Claude can help with your Holded data:</p>
        <div class="mockup-grid">
          <div class="mockup-card">
            <img src="/Screenshot%202026-04-24%20132040.png" alt="Financial Report Generated by Claude" />
          </div>
          <div class="mockup-card">
            <img src="/Screenshot%202026-04-24%20132052.png" alt="P&L Analysis with Claude" />
          </div>
          <div class="mockup-card">
            <img src="/Screenshot%202026-04-24%20132111.png" alt="PDF Export and Charts" />
          </div>
        </div>
      </div>

      <div class="warning" style="margin-top: 32px;">
        <strong>✓ Safe & Secure</strong>
        <p style="margin: 8px 0 0;">OAuth 2.0 authentication, your API key is encrypted, and read-mostly operations. The only write action is creating invoice drafts that require your review.</p>
      </div>

      <div class="footer-links">
        <a href="/docs">Documentation</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/dpa">Data Agreement</a>
        <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">Support</a>
      </div>
    `,
    'light'
  );
}

// Las páginas /docs, /privacy, /dpa, /terms y /support del conector Claude
// vivían aquí como render server-side. Se han eliminado: la única fuente de
// verdad son las páginas Next.js en holded.verifactu.business/conectores/claude/*.
// app.ts redirige 301 esas rutas hacia el dominio holded — solo la landing `/`
// se sigue renderizando localmente.
