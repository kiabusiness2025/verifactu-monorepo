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
    }
  };
})();
