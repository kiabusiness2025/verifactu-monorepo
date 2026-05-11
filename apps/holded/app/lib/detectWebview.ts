/**
 * Detección heurística de embedded webviews que Google bloquea para OAuth.
 *
 * Contexto: desde 2021, Google bloquea `signInWithPopup` y `signInWithRedirect`
 * desde webviews embebidos (ChatGPT iOS WKWebView, Claude desktop Electron,
 * Facebook in-app, Instagram in-app, etc.) devolviendo `disallowed_useragent`.
 *
 * Política oficial:
 * https://developers.googleblog.com/2016/08/modernizing-oauth-interactions-in-native-apps.html
 *
 * Estrategia en /auth/holded-direct:
 *   - Si detectamos webview → ESCONDEMOS el botón "Continuar con Google"
 *     y surfaceamos magic link como flow primario.
 *   - Mostramos CTA "Abrir en navegador externo" como escape hatch.
 *
 * Mantenimiento: las heurísticas pueden necesitar update cuando las apps
 * cambien sus user-agents. Si una nueva app viene con webview pero pasa los
 * checks, añadir keyword en `EMBEDDED_WEBVIEW_KEYWORDS`.
 */

const EMBEDDED_WEBVIEW_KEYWORDS = [
  // Generic webview indicators
  'fban',
  'fbav',
  'fb_iab',
  'instagram',
  'line/',
  'twitter',
  'micromessenger', // WeChat
  'qqbrowser',
  'mqqbrowser',
  'electron',
  // AI assistant apps (heurísticas — UA strings pueden cambiar)
  'chatgpt',
  'openai',
  'anthropic',
  'claudeapp',
  'claude-app',
] as const;

export function isLikelyEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();

  // iOS WKWebView dentro de app: contiene "applewebkit" pero NO "safari" en UA.
  // Esto matchea ChatGPT iOS app y otras apps que usan WKWebView nativo.
  const isIosWebView = /(iphone|ipad|ipod).*applewebkit(?!.*safari)/i.test(ua);
  if (isIosWebView) return true;

  // Android WebView: "wv" en UA + AppleWebKit
  const isAndroidWebView = /android.*wv\)/i.test(ua) || /;\s*wv\)/i.test(ua);
  if (isAndroidWebView) return true;

  // Keyword match para apps específicas
  return EMBEDDED_WEBVIEW_KEYWORDS.some((kw) => ua.includes(kw));
}

/**
 * Heurística adicional: detectar si Google está siendo bloqueado por la app
 * que envuelve nuestro browser. Útil para mostrar un mensaje más específico
 * que "es un webview" — p.ej. "ChatGPT app no permite Google login".
 */
export function getDetectedHostApp():
  | 'chatgpt'
  | 'claude'
  | 'instagram'
  | 'facebook'
  | 'line'
  | 'generic-webview'
  | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent.toLowerCase();

  if (/chatgpt|openai/i.test(ua)) return 'chatgpt';
  if (/anthropic|claudeapp|claude-app/i.test(ua)) return 'claude';
  if (/instagram/i.test(ua)) return 'instagram';
  if (/fban|fbav|fb_iab/i.test(ua)) return 'facebook';
  if (/line\//i.test(ua)) return 'line';
  if (isLikelyEmbeddedWebView()) return 'generic-webview';
  return null;
}

/**
 * Mensaje humano según el host detectado, para mostrar al usuario.
 */
export function getWebViewWarningMessage(host: ReturnType<typeof getDetectedHostApp>): {
  title: string;
  body: string;
} | null {
  switch (host) {
    case 'chatgpt':
      return {
        title: 'Google bloquea el login dentro de ChatGPT',
        body:
          'Por seguridad, Google no permite iniciar sesión desde la app de ChatGPT. ' +
          'Usa el enlace mágico por email (sin contraseña, abajo) o abre esta página ' +
          'en tu navegador.',
      };
    case 'claude':
      return {
        title: 'Google bloquea el login dentro de Claude',
        body:
          'Por seguridad, Google no permite iniciar sesión desde la app de Claude. ' +
          'Usa el enlace mágico por email (sin contraseña, abajo) o abre esta página ' +
          'en tu navegador.',
      };
    case 'instagram':
    case 'facebook':
    case 'line':
      return {
        title: 'Google bloquea el login dentro de esta app',
        body:
          'Para iniciar sesión con Google necesitas abrir esta página en tu navegador. ' +
          'O usa el enlace mágico por email — funciona sin contraseña.',
      };
    case 'generic-webview':
      return {
        title: 'Estás dentro de una aplicación embebida',
        body:
          'Google bloquea el login en navegadores embebidos. Usa el enlace mágico ' +
          'por email o abre esta página en tu navegador.',
      };
    default:
      return null;
  }
}
