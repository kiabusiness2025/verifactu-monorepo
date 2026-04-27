/* eslint-env browser */
/**
 * pipeline-utils.js — shared helpers for all demo scenes.
 * Loaded via <script src="/demo/pipeline-utils.js"> at end of each scene.
 *
 * URL params:
 *   ?once=1          Play one cycle only, then call window.signalDone()
 *   ?connector=X     Override connector theme (claude | chatgpt)
 */
(function () {
  const params = new URLSearchParams(location.search);
  const once = params.get('once') === '1';
  const connector = params.get('connector') || 'claude';

  // ── Hero/iframe mode: vertical stacked layout ───────────────
  // Hide sidebar. Stack chat (top ~45%) + artifact panel (bottom ~55%) vertically.
  // On mobile (≤520px): claude shows ONLY the artifact panel full-height (no split);
  // chatgpt has no artifact panel so the chat fills full height.
  if (window.parent !== window) {
    // Mobile: chat floats as semi-transparent overlay over the artifact panel.
    // Artifact fills 100% height (chat removed from flex flow via position:absolute).
    // No split — user sees the graphic immediately and question+answer overlay on top.
    const mobilePanelCSS =
      connector === 'claude'
        ? [
            'body{position:relative!important}',
            // Float chat over artifact — removed from flex flow
            '.chat{',
            'position:absolute!important;top:0;left:0;right:0;z-index:10!important;',
            'flex:none!important;max-height:42%!important;overflow:hidden!important;',
            'background:rgba(248,249,252,0.93)!important;',
            'border-bottom:1px solid rgba(229,231,235,0.85)!important;',
            '}',
            '.chat-header{display:none!important}',
            '.messages{padding:8px 10px!important;gap:5px!important}',
            '.avatar{width:20px!important;height:20px!important;font-size:9px!important}',
            '.bubble{font-size:11px!important;padding:5px 8px!important;line-height:1.4!important}',
            // Artifact fills full height since chat is out of flex flow
            '.artifact-panel{flex:1!important;border-top:none!important}',
          ].join('')
        : '.chat{flex:1!important;border-bottom:none!important}';

    const heroCSS = [
      '.sidebar{display:none!important}',
      'body{flex-direction:column!important}',
      // Desktop/tablet split: chat 45%, artifact 55%
      '.chat{flex:0 0 45%!important;min-width:0!important;border-right:none!important;border-bottom:1px solid #e5e7eb!important}',
      '.artifact-panel{display:flex!important;flex:1!important;border-left:none!important;border-top:1px solid #e5e7eb!important;min-height:0!important}',
      // Mobile: single panel, no split
      '@media(max-width:520px){' + mobilePanelCSS + '}',
    ].join('');

    const _hst = document.createElement('style');
    _hst.textContent = heroCSS;
    (document.head || document.documentElement).appendChild(_hst);
  }

  // ── Light theme — inject CSS before first paint ──────────
  const lightCSS = [
    // Layout backgrounds
    'body{background:#f5f7fa!important;color:#374151!important}',
    '.sidebar{background:#ffffff!important;border-right:1px solid #e5e7eb!important}',
    '.sb-top{border-bottom:1px solid #e5e7eb!important}',
    '.chat{background:#f8f9fc!important}',
    '.chat-header{background:#ffffff!important;border-bottom:1px solid #e5e7eb!important}',
    '#overlay{background:#f5f7fa!important}',
    // Sidebar text
    '.sb-name{color:#111827!important}',
    '.sb-sub,.sb-label,.ch-project{color:#9ca3af!important}',
    '.sb-item{color:#6b7280!important}',
    '.sb-item.active{background:rgba(0,0,0,0.05)!important;color:#111827!important}',
    '.ch-model{color:#111827!important}',
    // Scrollbar + thinking dots
    '.messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.09)!important}',
    '.td{background:#d1d5db!important}',
    // Avatars + bubbles
    '.avatar.u{background:#e2e8f0!important;color:#64748b!important}',
    '.bubble.u{background:#2563eb!important;color:#ffffff!important}',
    '.bubble.a{background:#ffffff!important;color:#374151!important;border:1px solid #e5e7eb!important}',
    // Response text
    '.r-intro{color:#374151!important}',
    '.r-intro strong,.r-note strong{color:#111827!important}',
    '.r-note{color:#6b7280!important}',
    // Cards / containers (use border-color so amber/red left-borders stay)
    '.r-card{background:#f9fafb!important;border-right-color:#e5e7eb!important;border-top-color:#e5e7eb!important;border-bottom-color:#e5e7eb!important}',
    '.r-client,.r-invoice,.r-invoice-doc,.r-total,.r-chart,.r-stat,.r-kpi,.r-aging-card,.r-action-card,.r-insights,.r-margin-bar{background:#f9fafb!important;border-color:#e5e7eb!important}',
    '.r-metric{background:#f9fafb!important;border-color:#e5e7eb!important;color:#374151!important}',
    '.r-row{color:#6b7280!important;border-bottom-color:#f3f4f6!important}',
    '.r-row-val{color:#374151!important}',
    '.r-divider{border-top-color:#e5e7eb!important}',
    // Tables
    '.r-table{background:#f9fafb!important;border-color:#e5e7eb!important}',
    '.r-thead{background:#f3f4f6!important;border-bottom-color:#e5e7eb!important}',
    '.r-th{color:#9ca3af!important}',
    '.r-tbody-row{border-bottom-color:#f3f4f6!important}',
    '.r-td{color:#374151!important}',
    '.r-td:first-child{color:#6b7280!important}',
    '.r-total-row{background:#f3f4f6!important;border-top-color:#e5e7eb!important}',
    '.r-total-td:not(.green):not(.red):not(.highlight){color:#111827!important}',
    '.r-section-label{color:#9ca3af!important;border-top-color:#e5e7eb!important;background:#f9fafb!important}',
    // Card text elements
    '.r-client-name,.r-inv-client,.r-inv-company,.r-inv-client-name,.r-inv-amount,.r-stat-val,.r-total-val{color:#111827!important}',
    '.r-client-meta,.r-inv-concept,.r-inv-from,.r-inv-to,.r-stat-lbl,.r-kpi-lbl,.r-aging-lbl,.r-action-sub,.r-bar-label,.r-bar-val{color:#9ca3af!important}',
    '.r-inv-header{border-bottom-color:#e5e7eb!important}',
    '.r-line{color:#374151!important;border-bottom-color:#f3f4f6!important}',
    '.r-line-desc{color:#6b7280!important}',
    '.r-totals-block{border-top-color:#e5e7eb!important}',
    '.r-subtotal,.r-total-lbl{color:#6b7280!important}',
    '.r-bar-track{background:rgba(0,0,0,0.07)!important}',
    '.r-margin-label{color:#6b7280!important}',
    '.r-margin-track{background:rgba(0,0,0,.06)!important}',
    '.r-insights-title{color:#9ca3af!important}',
    '.r-insight-row{color:#374151!important;border-bottom-color:#f3f4f6!important}',
    '.r-action-label{color:#374151!important}',
    '.r-inv-num{background:rgba(180,83,9,0.08)!important;color:#b45309!important}',
  ].join('');
  const _st = document.createElement('style');
  _st.textContent = lightCSS;
  (document.head || document.documentElement).appendChild(_st);

  // ── Connector themes ─────────────────────────────────────
  const THEMES = {
    claude: {
      accent: '#d97757',
      accentLight: 'rgba(217,119,87,0.08)',
      accentBorder: 'rgba(217,119,87,0.18)',
      badgeText: 'Conector activo',
      badgeDot: '#34d399',
      modelLabel: 'Claude · claude-opus-4-5',
      avatarBg: 'linear-gradient(135deg,#f97316,#dc2626)',
      avatarText: 'C',
    },
    chatgpt: {
      accent: '#10a37f',
      accentLight: 'rgba(16,163,127,0.08)',
      accentBorder: 'rgba(16,163,127,0.18)',
      badgeText: 'Plugin activo',
      badgeDot: '#10a37f',
      modelLabel: 'GPT-4o · Holded Plugin',
      avatarBg: 'linear-gradient(135deg,#10a37f,#0d7a60)',
      avatarText: 'G',
    },
  };

  const theme = THEMES[connector] || THEMES.claude;

  // Apply theme to CSS custom properties on :root
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-light', theme.accentLight);
  root.style.setProperty('--accent-border', theme.accentBorder);
  root.style.setProperty('--avatar-bg', theme.avatarBg);

  // Patch text elements (labels, badge text, model name) after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // Status pill text
    const pill = document.querySelector('.status-pill');
    if (pill) {
      const dot = pill.querySelector('.status-dot');
      pill.textContent = theme.badgeText;
      if (dot) pill.prepend(dot);
      pill.style.background = theme.accentLight;
      pill.style.border = `1px solid ${theme.accentBorder}`;
      pill.style.color = theme.accent;
      if (dot) dot.style.background = theme.badgeDot;
    }

    // Model label
    const modelEl = document.querySelector('.ch-model');
    if (modelEl) modelEl.textContent = theme.modelLabel;

    // Avatar initials
    document.querySelectorAll('.avatar.a').forEach((el) => {
      el.textContent = theme.avatarText;
      el.style.background = theme.avatarBg;
    });

    // Sidebar logo text
    const sbIcon = document.querySelector('.sb-icon');
    if (sbIcon && connector === 'chatgpt') sbIcon.textContent = 'G';

    // Tool badge color (amber stays for Holded regardless of connector)
    // Nothing to change — amber is Holded's color, not the connector's
  });

  // ── Once mode: expose signalDone for Playwright ───────────
  window.__pipelineOnce = once;
  window.__pipelineDone = false;
  window.markSceneDone = function () {
    if (!window.__pipelineDone) {
      window.__pipelineDone = true;
      // Signal to Playwright recorder if the function was exposed
      if (typeof window.signalDone === 'function') {
        window.signalDone();
      }
      // Signal parent frame for iframe embed cycling
      try {
        if (window.parent !== window) {
          window.parent.postMessage({ holded: 'sceneDone' }, '*');
        }
      } catch (_) {
        /* cross-origin postMessage blocked — safe to ignore */
      }
    }
  };
})();
