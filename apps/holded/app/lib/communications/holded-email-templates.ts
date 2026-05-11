type LeadInput = {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  cif?: string;
  sector?: string;
  role?: string;
  message?: string;
  source?: string;
};

type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type AccessEmailInput = {
  email: string;
  accessUrl: string;
  dashboardUrl: string;
};

type HoldedConnectedEmailInput = {
  name: string;
  email: string;
  companyName: string;
  chatUrl: string;
  settingsUrl: string;
  profileCompletionUrl?: string;
  supportedModules: string[];
  channel?: 'dashboard' | 'chatgpt' | 'claude';
  returnUrl?: string | null;
  adminPanelUrl?: string | null;
};

type HoldedCompanyEmailVerificationInput = {
  companyName: string;
  verificationUrl: string;
  profileCompletionUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function greeting(name: string) {
  const trimmed = name.trim();
  return trimmed ? `Hola ${trimmed},` : 'Hola,';
}

function sanitizeCompanyName(name: string | null | undefined): string {
  const trimmed = name?.trim() || '';
  if (!trimmed) return 'tu cuenta de Holded';
  const lower = trimmed.toLowerCase();
  const placeholders = [
    'tu empresa',
    'demo',
    'empresa demo',
    'empresa de ejemplo',
    'test company',
    'my company',
    'mi empresa',
  ];
  if (placeholders.includes(lower)) return 'tu cuenta de Holded';
  if (lower.endsWith('- holded')) return 'tu cuenta de Holded';
  return trimmed;
}

function holdedSiteUrl() {
  return process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() || 'https://holded.verifactu.business';
}

function brandHeader(label: string) {
  const siteUrl = holdedSiteUrl();
  const holdedLogo = `${siteUrl}/brand/holded/holded-diamond-logo.png`;

  return `
    <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 55%,#eef4ff 100%);border-radius:24px 24px 0 0;border:1px solid #fde7ea;border-bottom:none;">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="display:inline-flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:#ffffff;border:1px solid #f3d0d7;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">
              <img src="${holdedLogo}" alt="Holded" width="18" height="18" style="display:block;border:0;" />
              ${label}
            </div>
          </td>
          <td align="right" style="vertical-align:middle;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            Conector Verifactu
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

function brandHeaderClaude(label: string) {
  const siteUrl = holdedSiteUrl();
  const holdedLogo = `${siteUrl}/brand/holded/holded-diamond-logo.png`;

  return `
    <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 55%,#ecfdf5 100%);border-radius:24px 24px 0 0;border:1px solid #fde68a;border-bottom:none;">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="display:inline-flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:#ffffff;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:700;letter-spacing:0.04em;">
              <img src="${holdedLogo}" alt="Holded" width="18" height="18" style="display:block;border:0;" />
              ${label}
            </div>
          </td>
          <td align="right" style="vertical-align:middle;color:#d97706;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            Conector Claude
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

function cardLayoutClaude(input: { label: string; title: string; body: string; footer?: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        ${brandHeaderClaude(input.label)}
        <div style="padding:28px;">
          <h1 style="font-size:28px;line-height:1.15;margin:0 0 12px;">${input.title}</h1>
          ${input.body}
          ${input.footer || ''}
        </div>
      </div>
    </div>
  `.trim();
}

function cardLayout(input: { label: string; title: string; body: string; footer?: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        ${brandHeader(input.label)}
        <div style="padding:28px;">
          <h1 style="font-size:28px;line-height:1.15;margin:0 0 12px;">${input.title}</h1>
          ${input.body}
          ${input.footer || ''}
        </div>
      </div>
    </div>
  `.trim();
}

function legalFooter() {
  return `
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
      Powered by <a href="https://verifactu.business" style="color:#b4233c;">verifactu.business</a> ·
      Solution Partner autorizado de Holded ·
      <a href="https://holded.verifactu.business/legal" style="color:#b4233c;">Aviso legal</a> ·
      <a href="https://holded.verifactu.business/privacy" style="color:#b4233c;">Privacidad</a> ·
      <a href="https://holded.verifactu.business/terms" style="color:#b4233c;">Terminos</a>
    </p>
  `.trim();
}

export function buildHoldedWelcomeEmail(input: LeadInput): EmailTemplate {
  const hello = greeting(input.name);

  return {
    subject: 'Bienvenido al Conector Holded',
    html: cardLayout({
      label: 'Conector Holded',
      title: 'Tu acceso gratuito ya esta preparado',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">Gracias por empezar con <strong>el Conector Holded</strong>. Ya puedes conectar tu empresa <strong>${escapeHtml(input.companyName)}</strong> y empezar a trabajar con tus datos reales.</p>
        <p style="margin:0 0 18px;">Si quieres, responde a este correo y te ayudamos paso a paso en menos de 24h.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Continuar onboarding</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:13px;color:#475569;margin:0;">Soporte: <a href="mailto:soporte@verifactu.business" style="color:#b4233c;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nGracias por empezar con el Conector Holded. Tu acceso gratuito para ${input.companyName} ya esta preparado.\n\nContinua aqui: https://holded.verifactu.business\n\nSi necesitas ayuda, responde a este correo o escribe a soporte@verifactu.business.`,
  };
}

export function buildHoldedOnboardingGuideEmail(input: LeadInput): EmailTemplate {
  const onboardingUrl = holdedSiteUrl();
  const holdedDocsUrl =
    'https://help.holded.com/es/articles/6896051-como-generar-y-usar-la-api-de-holded';

  return {
    subject: 'Como obtener tu API key de Holded (2 minutos)',
    html: cardLayout({
      label: 'Guia rapida',
      title: 'Consigue tu API key en 2 minutos',
      body: `
        <p style="margin:0 0 14px;color:#475569;font-size:14px;">Necesitas una API key activa de Holded para completar la conexion. Sigue estos pasos dentro de tu cuenta de Holded:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px 20px;margin:0 0 18px;">
          <div style="margin:0 0 12px;display:flex;align-items:flex-start;gap:12px;">
            <div style="background:#ff5460;color:#fff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;line-height:22px;text-align:center;">1</div>
            <p style="margin:0;font-size:14px;color:#334155;">Accede a tu cuenta de Holded y ve a <strong>Configuracion → Desarrolladores → API Keys</strong>.</p>
          </div>
          <div style="margin:0 0 12px;display:flex;align-items:flex-start;gap:12px;">
            <div style="background:#ff5460;color:#fff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;line-height:22px;text-align:center;">2</div>
            <p style="margin:0;font-size:14px;color:#334155;">Pulsa <strong>Nueva API Key</strong>, dale un nombre reconocible y copia la clave generada.</p>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="background:#ff5460;color:#fff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;line-height:22px;text-align:center;">3</div>
            <p style="margin:0;font-size:14px;color:#334155;">Vuelve al onboarding del conector, pega la clave y validamos la conexion al instante.</p>
          </div>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;margin:0 0 20px;font-size:13px;color:#92400e;">
          <strong>Requiere plan de pago en Holded</strong> y rol Owner o Administrador en la empresa para poder generar API keys.
          <a href="${holdedDocsUrl}" style="color:#b45309;display:block;margin-top:6px;">Ver documentacion oficial de Holded →</a>
        </div>
        <a href="${onboardingUrl}/onboarding/holded" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;font-size:14px;">Continuar onboarding</a>
      `,
      footer: legalFooter(),
    }),
    text: `Como obtener tu API key de Holded:\n\n1) Holded → Configuracion → Desarrolladores → API Keys\n2) Crea nueva clave y copiala\n3) Pegala en el onboarding del conector\n\nRequiere plan de pago y rol Owner/Administrador.\nDocumentacion: ${holdedDocsUrl}\n\nContinuar: ${onboardingUrl}/onboarding/holded`,
  };
}

export function buildHoldedVerificationEmail(input: {
  email: string;
  verificationUrl: string;
}): EmailTemplate {
  return {
    subject: 'Confirma tu correo para activar el Conector Holded',
    html: cardLayout({
      label: 'Activa tu acceso',
      title: 'Un paso mas para empezar',
      body: `
        <p style="margin:0 0 14px;">Hemos creado tu acceso con <strong>${escapeHtml(input.email)}</strong>.</p>
        <p style="margin:0 0 18px;">Confirma tu correo y despues podras iniciar sesion para conectar Holded.</p>
        <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      `,
      footer: legalFooter(),
    }),
    text: `Confirma tu correo para activar el Conector Holded.\n\nEmail: ${input.email}\n\nVerificar: ${input.verificationUrl}`,
  };
}

export function buildHoldedAccessReadyEmail(input: AccessEmailInput): EmailTemplate {
  return {
    subject: 'Tu acceso al Conector Holded ya esta activo',
    html: cardLayout({
      label: 'Acceso confirmado',
      title: 'Ya puedes entrar y conectar Holded',
      body: `
        <p style="margin:0 0 14px;">Tu correo <strong>${escapeHtml(input.email)}</strong> ya esta verificado.</p>
        <p style="margin:0 0 18px;">Entra ahora en tu acceso y conecta tu API key de Holded.</p>
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Entrar ahora</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Si necesitas ayuda, responde a este correo y te acompanamos paso a paso.</p>
      `,
      footer: legalFooter(),
    }),
    text: `Tu acceso al Conector Holded ya esta activo.\n\nEmail: ${input.email}\n\nEntrar: ${input.accessUrl}`,
  };
}

export function buildHoldedConnectedEmail(input: HoldedConnectedEmailInput): EmailTemplate {
  const hello = greeting(input.name);
  const company = sanitizeCompanyName(input.companyName);
  const modules = input.supportedModules.join(', ') || 'sin detalle';
  const profileCompletionUrl = input.profileCompletionUrl || input.settingsUrl;
  const isChatgptFlow = input.channel === 'chatgpt';
  const isClaudeFlow = input.channel === 'claude';
  const isAiFlow = isChatgptFlow || isClaudeFlow;
  const aiLabel = isClaudeFlow ? 'Claude' : 'ChatGPT';
  const primaryUrl = input.returnUrl || input.chatUrl;
  const primaryLabel = isChatgptFlow
    ? 'Volver a ChatGPT'
    : isClaudeFlow
      ? 'Volver a Claude'
      : 'Abrir panel de control';
  const primaryColor = isClaudeFlow ? '#d97706' : '#ff5460';
  const recommendedSteps = isAiFlow
    ? `
          <ol style="padding-left:18px;margin:0;">
            <li style="margin:0 0 6px;">Vuelve a ${aiLabel} para terminar la autorizacion.</li>
            <li style="margin:0 0 6px;">Prueba una consulta real con tus datos de Holded.</li>
            <li style="margin:0;">Si mas adelante necesitas soporte, responde a este correo.</li>
          </ol>
        `
    : `
          <ol style="padding-left:18px;margin:0;">
            <li style="margin:0 0 6px;">Abre tu panel de control.</li>
            <li style="margin:0 0 6px;">Revisa el estado de la conexion y de tu empresa.</li>
            <li style="margin:0;">Completa datos pendientes si quieres dejar el contexto mas afinado.</li>
          </ol>
        `;
  const secondaryCta = isAiFlow
    ? ''
    : `<a href="${escapeHtml(profileCompletionUrl)}" style="display:inline-block;margin-left:12px;background:#ffffff;color:#b4233c;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;border:1px solid #f3d0d7;">Completar datos</a>`;
  const nextStepsText = isAiFlow
    ? `Siguientes pasos:\n1) Vuelve a ${aiLabel}\n2) Prueba una consulta con tus datos\n3) Si necesitas ayuda, responde a este correo`
    : `Siguientes pasos:\n1) Abre tu panel de control\n2) Revisa el estado de la conexion\n3) Completa datos pendientes si lo necesitas`;
  const layout = isClaudeFlow ? cardLayoutClaude : cardLayout;
  const titleText = isChatgptFlow
    ? 'Holded ya esta disponible en ChatGPT'
    : isClaudeFlow
      ? 'Holded ya esta disponible en Claude'
      : 'Tu conexion de Holded ya esta activa';

  return {
    subject: `Holded conectado en ${company}`,
    html: layout({
      label: 'Conexion activa',
      title: titleText,
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">La conexion de Holded para <strong>${escapeHtml(company)}</strong> ya esta activa.</p>
        <p style="margin:0 0 18px;">Modulos validados: <strong>${escapeHtml(modules)}</strong>.</p>
        <div style="margin:0 0 18px;padding:16px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div style="font-weight:700;margin:0 0 8px;">Siguientes pasos recomendados</div>
          ${recommendedSteps}
        </div>
        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block;background:${primaryColor};color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">${primaryLabel}</a>
        ${secondaryCta}
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nLa conexion de Holded para ${company} ya esta activa.\n\n${nextStepsText}\n\n${primaryLabel}: ${primaryUrl}${isAiFlow ? '' : `\nCompletar datos: ${profileCompletionUrl}`}`,
  };
}

export function buildHoldedCompanyEmailVerificationEmail(
  input: HoldedCompanyEmailVerificationInput
): EmailTemplate {
  return {
    subject: `Confirma el correo de empresa de ${input.companyName}`,
    html: cardLayout({
      label: 'Verificacion de correo',
      title: 'Confirma este correo para verificar la empresa',
      body: `
        <p style="margin:0 0 14px;">Hemos recibido este correo como correo de empresa para <strong>${escapeHtml(input.companyName)}</strong>.</p>
        <p style="margin:0 0 18px;">Para dejar la empresa verificada, confirma este correo con el siguiente boton.</p>
        <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo de empresa</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Despues podras completar sector CNAE y direccion de empresa aqui: <a href="${escapeHtml(input.profileCompletionUrl)}" style="color:#b4233c;">completar datos</a>.</p>
      `,
      footer: legalFooter(),
    }),
    text: `Confirma el correo de empresa de ${input.companyName}.\n\nVerificar correo: ${input.verificationUrl}\n\nCompletar datos de empresa: ${input.profileCompletionUrl}`,
  };
}

export function buildHoldedConnectedAdminEmail(input: HoldedConnectedEmailInput): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const modules = input.supportedModules.join(', ') || 'sin detalle';
  const isChatgptFlow = input.channel === 'chatgpt';
  const isClaudeFlow = input.channel === 'claude';
  const channelLabel = isChatgptFlow ? 'ChatGPT' : isClaudeFlow ? 'Claude' : 'Panel';
  const adminPanelUrl = input.adminPanelUrl || null;
  const now = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return {
    subject: `[Holded] Nueva conexion — ${company} (${channelLabel})`,
    html: cardLayout({
      label: 'Notificacion interna',
      title: 'Nueva conexion Holded activada',
      body: `
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:40%;">Empresa</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(company)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Email usuario</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(input.email)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Canal</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(channelLabel)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Modulos</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">${escapeHtml(modules)}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Fecha</td><td style="padding:8px 0;font-size:13px;color:#0f172a;">${escapeHtml(now)}</td></tr>
        </table>
        <a href="${escapeHtml(adminPanelUrl || 'https://admin.verifactu.business/panel')}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;margin-right:10px;">Ver panel de control</a>
      `,
      footer: legalFooter(),
    }),
    text: `[Holded] Nueva conexion activada\n\nEmpresa: ${company}\nEmail: ${input.email}\nCanal: ${channelLabel}\nModulos: ${modules}\nFecha: ${now}\n\nPanel de control: ${adminPanelUrl || 'https://admin.verifactu.business/panel'}`,
  };
}

const chatgptPromptExamples = [
  '¿Que facturas debo revisar hoy para proteger mi caja?',
  '¿Quienes son mis clientes con mayor riesgo de cobro?',
  'Explicame el diario de esta semana en lenguaje claro.',
  '¿Cuales son mis gastos mas grandes del mes?',
  'Prepara un borrador de factura para [nombre del cliente].',
];

export function buildHoldedWelcomeChatgptEmail(input: {
  name: string;
  returnUrl?: string | null;
  profileCompletionUrl: string;
}): EmailTemplate {
  const hello = greeting(input.name);
  const primaryUrl = input.returnUrl || 'https://chatgpt.com';
  const promptRows = chatgptPromptExamples
    .map(
      (p, i) =>
        `<div style="padding:10px 16px;${i < chatgptPromptExamples.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}font-size:13px;color:#334155;"><span style="color:#ff5460;font-weight:700;margin-right:8px;">›</span>${escapeHtml(p)}</div>`
    )
    .join('');

  return {
    subject: 'Tu conexion de Holded ya esta lista',
    html: cardLayout({
      label: 'Primera conexion',
      title: 'Ya puedes consultar Holded desde ChatGPT',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 18px;">Tu cuenta de Holded ya esta conectada. Puedes empezar ahora mismo con preguntas como estas directamente en ChatGPT:</p>
        <div style="margin:0 0 22px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          ${promptRows}
        </div>
        <p style="margin:0 0 18px;font-size:13px;color:#64748b;">El conector accede a la API oficial de Holded. Solo prepara borradores de factura cuando tu lo confirmas explicitamente. Todo lo demas es lectura.</p>
        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;margin-right:10px;">Ir a ChatGPT ahora</a>
        <a href="${escapeHtml(input.profileCompletionUrl)}" style="display:inline-block;background:#ffffff;color:#b4233c;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;border:1px solid #f3d0d7;">Completar contexto</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Si necesitas ayuda, responde a este correo o escribe a <a href="mailto:soporte@verifactu.business" style="color:#b4233c;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nTu cuenta de Holded ya esta conectada a ChatGPT.\n\nPreguntas que puedes hacer ahora:\n${chatgptPromptExamples.map((p) => `• ${p}`).join('\n')}\n\nIr a ChatGPT: ${primaryUrl}\nCompletar contexto: ${input.profileCompletionUrl}`,
  };
}

const claudePromptExamples = [
  '¿Cual es el resultado neto de este trimestre?',
  '¿Que clientes tienen facturas pendientes de cobro?',
  'Resume el libro diario de esta semana.',
  '¿Cuales son mis gastos mas grandes del mes?',
  'Prepara un borrador de factura para [nombre del cliente].',
];

export function buildHoldedWelcomeClaudeEmail(input: {
  name: string;
  returnUrl?: string | null;
  profileCompletionUrl: string;
}): EmailTemplate {
  const hello = greeting(input.name);
  const primaryUrl = input.returnUrl || 'https://claude.ai';
  const promptRows = claudePromptExamples
    .map(
      (p, i) =>
        `<div style="padding:10px 16px;${i < claudePromptExamples.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}font-size:13px;color:#334155;"><span style="color:#d97706;font-weight:700;margin-right:8px;">›</span>${escapeHtml(p)}</div>`
    )
    .join('');

  return {
    subject: 'Tu conexion de Holded ya esta lista en Claude',
    html: cardLayoutClaude({
      label: 'Primera conexion Claude',
      title: 'Ya puedes consultar Holded desde Claude',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 18px;">Tu cuenta de Holded ya esta conectada a Claude. Puedes empezar ahora mismo con preguntas como estas:</p>
        <div style="margin:0 0 22px;background:#fffbeb;border-radius:16px;border:1px solid #fde68a;overflow:hidden;">
          ${promptRows}
        </div>
        <p style="margin:0 0 18px;font-size:13px;color:#64748b;">El conector accede a la API oficial de Holded. Solo prepara borradores de factura cuando tu lo confirmas explicitamente. Todo lo demas es lectura.</p>
        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;margin-right:10px;">Ir a Claude ahora</a>
        <a href="${escapeHtml(input.profileCompletionUrl)}" style="display:inline-block;background:#ffffff;color:#92400e;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;border:1px solid #fde68a;">Completar contexto</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Si necesitas ayuda, responde a este correo o escribe a <a href="mailto:soporte@verifactu.business" style="color:#d97706;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nTu cuenta de Holded ya esta conectada a Claude.\n\nPreguntas que puedes hacer ahora:\n${claudePromptExamples.map((p) => `• ${p}`).join('\n')}\n\nIr a Claude: ${primaryUrl}\nCompletar contexto: ${input.profileCompletionUrl}`,
  };
}

export function buildHoldedProfileCompletionEmail(input: {
  name: string;
  profileCompletionUrl: string;
}): EmailTemplate {
  const hello = greeting(input.name);
  const fields = [
    { label: 'Tu nombre preferido', why: 'para que el conector te trate por tu nombre' },
    { label: 'Nombre de tu empresa', why: 'para contextualizar las respuestas a tu negocio' },
    { label: 'Tu rol en la empresa', why: 'para adaptar el nivel de detalle de las respuestas' },
    {
      label: 'Sector de actividad',
      why: 'para mejorar la precision en consultas de gastos e ingresos',
    },
    { label: 'Tus objetivos principales', why: 'para priorizar lo mas relevante para ti' },
  ];
  const fieldRows = fields
    .map(
      (f, i) =>
        `<tr>
          <td style="padding:9px 0;${i < fields.length - 1 ? 'border-bottom:1px solid #f8fafc;' : ''}font-size:13px;font-weight:600;color:#0f172a;width:45%;">${escapeHtml(f.label)}</td>
          <td style="padding:9px 0;${i < fields.length - 1 ? 'border-bottom:1px solid #f8fafc;' : ''}font-size:12px;color:#64748b;">${escapeHtml(f.why)}</td>
        </tr>`
    )
    .join('');

  return {
    subject: 'Completa el contexto inicial de Holded (2 minutos)',
    html: cardLayout({
      label: 'Mejora tu experiencia',
      title: 'Completa el contexto inicial de tu empresa',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 16px;">Completar este contexto inicial ayuda al conector a darte respuestas mas precisas y relevantes para tu negocio. Solo son 2 minutos.</p>
        <div style="margin:0 0 20px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;padding:6px 16px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${fieldRows}
          </table>
        </div>
        <p style="margin:0 0 18px;font-size:13px;color:#475569;">Todos los datos son opcionales. Puedes completar solo lo que quieras y editar en cualquier momento.</p>
        <a href="${escapeHtml(input.profileCompletionUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;">Completar contexto ahora</a>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nCompletar el contexto inicial ayuda al conector a darte respuestas mas precisas.\n\nCampos disponibles:\n${fields.map((f) => `• ${f.label}`).join('\n')}\n\nCompletar contexto: ${input.profileCompletionUrl}`,
  };
}

export function buildHoldedDisconnectedEmail(input: {
  name: string;
  companyName: string;
  channel: 'dashboard' | 'chatgpt' | 'claude' | 'mobile';
  reconnectUrl: string;
}): EmailTemplate {
  const hello = greeting(input.name);
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel =
    input.channel === 'chatgpt' || input.channel === 'mobile'
      ? 'ChatGPT'
      : input.channel === 'claude'
        ? 'Claude'
        : 'el panel';

  return {
    subject: `Has desconectado Holded de ${channelLabel}`,
    html: cardLayout({
      label: 'Conexion desactivada',
      title: `Tu Holded ya no esta conectado a ${channelLabel}`,
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">La conexion de <strong>${escapeHtml(company)}</strong> con ${escapeHtml(channelLabel)} ha sido desactivada correctamente. Tus datos siguen intactos en Holded; solo hemos retirado el acceso del conector.</p>
        <div style="margin:0 0 20px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;padding:14px 18px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f172a;">¿Que ocurre ahora?</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.8;">
            <li>El conector ya no puede leer datos de Holded.</li>
            <li>Tu cuenta de Holded y todos tus datos siguen sin cambios.</li>
            <li>Puedes volver a conectar en cualquier momento.</li>
          </ul>
        </div>
        <a href="${escapeHtml(input.reconnectUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;">Volver a conectar</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Si no fuiste tu quien desconecto, responde a este correo o escribe a <a href="mailto:soporte@verifactu.business" style="color:#b4233c;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nLa conexion de ${company} con ${channelLabel} ha sido desactivada.\n\nTus datos en Holded siguen intactos. Puedes volver a conectar cuando quieras:\n${input.reconnectUrl}\n\nSi no fuiste tu, escribe a soporte@verifactu.business.`,
  };
}

export function buildHoldedDisconnectedAdminEmail(input: {
  name: string;
  userEmail: string;
  companyName: string;
  channel: 'dashboard' | 'chatgpt' | 'claude' | 'mobile';
  adminPanelUrl: string;
}): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel =
    input.channel === 'chatgpt' || input.channel === 'mobile'
      ? 'ChatGPT'
      : input.channel === 'claude'
        ? 'Claude'
        : 'Panel';
  const now = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return {
    subject: `[Holded Admin] Desconexion — ${company} (${channelLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:22px 28px 14px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-bottom:1px solid #e2e8f0;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Holded Admin · Desconexion</span>
            <h1 style="font-size:20px;margin:6px 0 0;color:#0f172a;">${escapeHtml(company)} · ${escapeHtml(channelLabel)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              ${[
                ['Empresa', company],
                ['Email', input.userEmail],
                ['Canal', channelLabel],
                ['Fecha', now],
              ]
                .map(
                  ([label, value]) => `
                <tr>
                  <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f1f5f9;width:35%;">${escapeHtml(label)}</td>
                  <td style="padding:9px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(value)}</td>
                </tr>`
                )
                .join('')}
            </table>
            <div style="margin-top:20px;">
              <a href="${escapeHtml(input.adminPanelUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:13px;">Ver en panel de admin</a>
            </div>
          </div>
        </div>
      </div>
    `.trim(),
    text: `[Holded Admin] Desconexion\nEmpresa: ${company}\nEmail: ${input.userEmail}\nCanal: ${channelLabel}\nFecha: ${now}\n\nPanel: ${input.adminPanelUrl}`,
  };
}

export function buildHoldedWeeklyAdminSummaryEmail(input: {
  weekLabel: string;
  newConnections: number;
  newConnectionsByChannel: { chatgpt: number; dashboard: number; claude?: number };
  disconnections: number;
  totalActive: number;
  adminPanelUrl: string;
}): EmailTemplate {
  const {
    weekLabel,
    newConnections,
    newConnectionsByChannel,
    disconnections,
    totalActive,
    adminPanelUrl,
  } = input;

  const rows = [
    { label: 'Nuevas conexiones', value: String(newConnections), highlight: newConnections > 0 },
    { label: '— via ChatGPT', value: String(newConnectionsByChannel.chatgpt), highlight: false },
    {
      label: '— via Claude',
      value: String(newConnectionsByChannel.claude ?? 0),
      highlight: false,
    },
    {
      label: '— via Panel',
      value: String(newConnectionsByChannel.dashboard),
      highlight: false,
    },
    { label: 'Desconexiones', value: String(disconnections), highlight: disconnections > 0 },
    { label: 'Conexiones activas totales', value: String(totalActive), highlight: true },
  ];

  const tableRows = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:${r.label.startsWith('—') ? '#64748b' : '#0f172a'};border-bottom:1px solid #f1f5f9;">${escapeHtml(r.label)}</td>
          <td style="padding:10px 14px;font-size:14px;font-weight:${r.highlight ? '700' : '500'};color:${r.highlight ? '#ff5460' : '#475569'};text-align:right;border-bottom:1px solid #f1f5f9;">${escapeHtml(r.value)}</td>
        </tr>`
    )
    .join('');

  return {
    subject: `[Holded Admin] Resumen semanal — ${weekLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:22px 28px 14px;background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 55%,#eef4ff 100%);border-bottom:1px solid #fde7ea;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b4233c;">Holded Admin · Resumen semanal</span>
            <h1 style="font-size:22px;margin:6px 0 0;color:#0f172a;">${escapeHtml(weekLabel)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
              ${tableRows}
            </table>
            <div style="margin-top:24px;">
              <a href="${escapeHtml(adminPanelUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:13px;">Ver panel de administracion</a>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">Este correo se envia automaticamente cada lunes a las 09:00 CET. Responde a este correo si detectas algun problema.</p>
          </div>
        </div>
      </div>
    `.trim(),
    text: `[Holded Admin] Resumen semanal - ${weekLabel}\n\nNuevas conexiones: ${newConnections} (ChatGPT: ${newConnectionsByChannel.chatgpt}, Claude: ${newConnectionsByChannel.claude ?? 0}, Panel: ${newConnectionsByChannel.dashboard})\nDesconexiones: ${disconnections}\nConexiones activas totales: ${totalActive}\n\nPanel de administracion: ${adminPanelUrl}`,
  };
}

export function buildHoldedInternalContactEmail(input: {
  name: string;
  email: string;
  subject?: string;
  cif?: string;
  sector?: string;
  role?: string;
  message: string;
}): EmailTemplate {
  const subjectRow = input.subject
    ? `<p style="margin:0 0 8px;"><strong>Asunto:</strong> ${escapeHtml(input.subject)}</p>`
    : '';

  const extraRows = [
    input.cif
      ? `<p style="margin:0 0 8px;"><strong>CIF:</strong> ${escapeHtml(input.cif)}</p>`
      : '',
    input.sector
      ? `<p style="margin:0 0 8px;"><strong>Sector:</strong> ${escapeHtml(input.sector)}</p>`
      : '',
    input.role
      ? `<p style="margin:0 0 8px;"><strong>Rol:</strong> ${escapeHtml(input.role)}</p>`
      : '',
  ].join('');

  const extraText = [
    input.subject ? `Asunto: ${input.subject}` : '',
    input.cif ? `CIF: ${input.cif}` : '',
    input.sector ? `Sector: ${input.sector}` : '',
    input.role ? `Rol: ${input.role}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const emailSubject = input.subject
    ? `Contacto [${input.subject}]: ${input.name}`
    : `Solicitud de contacto: ${input.name}`;

  return {
    subject: emailSubject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="margin:0 0 12px;">Nueva solicitud de contacto (holded.verifactu.business)</h2>
        <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></p>
        ${subjectRow}
        ${extraRows}
        <p style="margin:8px 0 6px;"><strong>Mensaje:</strong></p>
        <blockquote style="margin:0 0 0 8px;padding:10px 16px;border-left:3px solid #e2e8f0;color:#334155;font-size:14px;">${escapeHtml(input.message).replace(/\n/g, '<br>')}</blockquote>
      </div>
    `.trim(),
    text: `Nueva solicitud de contacto\nNombre: ${input.name}\nEmail: ${input.email}\n${extraText}\nMensaje:\n${input.message}`,
  };
}

export function buildHoldedContactConfirmationEmail(input: { name: string }): EmailTemplate {
  return {
    subject: 'Hemos recibido tu mensaje — verifactu.business',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:0;background:#fff;">
        <div style="background:linear-gradient(135deg,#ff5460 0%,#ef4654 100%);padding:32px 28px;border-radius:16px 16px 0 0;">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">Hemos recibido tu mensaje</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 14px;">Hola ${escapeHtml(input.name)},</p>
          <p style="margin:0 0 14px;">Gracias por ponerte en contacto con nosotros. Hemos recibido tu solicitud y nos pondremos en contacto contigo lo antes posible — habitualmente en menos de 24 horas en dias laborables.</p>
          <p style="margin:0 0 14px;">Si tienes algo urgente, puedes escribirnos directamente a <a href="mailto:info@verifactu.business" style="color:#ff5460;">info@verifactu.business</a> o contactarnos por WhatsApp al <a href="https://wa.me/34696550480" style="color:#ff5460;">+34 696 55 04 80</a>.</p>
          <p style="margin:24px 0 0;font-size:13px;color:#64748b;">— El equipo de verifactu.business</p>
        </div>
      </div>
    `.trim(),
    text: `Hola ${input.name},\n\nHemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.\n\nSi tienes algo urgente: info@verifactu.business o WhatsApp +34 696 55 04 80.\n\n— El equipo de verifactu.business`,
  };
}

export function buildHoldedInternalLeadEmail(input: LeadInput): EmailTemplate {
  const source = input.source?.trim() || 'holded_web';
  const extraRows = [
    input.phone
      ? `<p style="margin:0 0 8px;"><strong>Telefono:</strong> ${escapeHtml(input.phone)}</p>`
      : '',
    input.cif
      ? `<p style="margin:0 0 8px;"><strong>CIF / NIF:</strong> ${escapeHtml(input.cif)}</p>`
      : '',
    input.sector
      ? `<p style="margin:0 0 8px;"><strong>Sector:</strong> ${escapeHtml(input.sector)}</p>`
      : '',
    input.role
      ? `<p style="margin:0 0 8px;"><strong>Rol:</strong> ${escapeHtml(input.role)}</p>`
      : '',
    input.message
      ? `<p style="margin:8px 0 6px;"><strong>Objetivo de la prueba:</strong></p><blockquote style="margin:0 0 0 8px;padding:10px 16px;border-left:3px solid #e2e8f0;color:#334155;font-size:14px;">${escapeHtml(input.message).replace(/\n/g, '<br>')}</blockquote>`
      : '',
  ].join('');
  const extraText = [
    input.phone ? `Telefono: ${input.phone}` : '',
    input.cif ? `CIF / NIF: ${input.cif}` : '',
    input.sector ? `Sector: ${input.sector}` : '',
    input.role ? `Rol: ${input.role}` : '',
    input.message ? `Objetivo de la prueba:\n${input.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Nuevo lead Holded: ${input.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="margin:0 0 12px;">Nuevo lead en flujo Holded</h2>
        <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin:0 0 8px;"><strong>Empresa:</strong> ${escapeHtml(input.companyName)}</p>
        ${extraRows}
        <p style="margin:0 0 8px;"><strong>Origen:</strong> ${escapeHtml(source)}</p>
      </div>
    `.trim(),
    text: `Nuevo lead Holded\nNombre: ${input.name}\nEmail: ${input.email}\nEmpresa: ${input.companyName}\n${extraText ? `${extraText}\n` : ''}Origen: ${source}`,
  };
}

type DemoRequestEmailInput = {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  taxId?: string;
  role?: string;
  usesHolded?: boolean;
  objective?: string;
  source?: string;
  id: string;
};

export function buildHoldedInternalDemoRequestEmail(input: DemoRequestEmailInput): EmailTemplate {
  const source = input.source?.trim() || 'holded_demo';
  const extraRows = [
    input.phone
      ? `<p style="margin:0 0 8px;"><strong>Telefono:</strong> ${escapeHtml(input.phone)}</p>`
      : '',
    input.taxId
      ? `<p style="margin:0 0 8px;"><strong>CIF / NIF:</strong> ${escapeHtml(input.taxId)}</p>`
      : '',
    input.role
      ? `<p style="margin:0 0 8px;"><strong>Rol:</strong> ${escapeHtml(input.role)}</p>`
      : '',
    `<p style="margin:0 0 8px;"><strong>Usa Holded:</strong> ${input.usesHolded ? 'Sí' : 'No'}</p>`,
    input.objective
      ? `<p style="margin:8px 0 6px;"><strong>Qué quiere ver en la demo:</strong></p><blockquote style="margin:0 0 0 8px;padding:10px 16px;border-left:3px solid #ff5460;color:#334155;font-size:14px;">${escapeHtml(input.objective).replace(/\n/g, '<br>')}</blockquote>`
      : '',
  ].join('');
  const extraText = [
    input.phone ? `Telefono: ${input.phone}` : '',
    input.taxId ? `CIF / NIF: ${input.taxId}` : '',
    input.role ? `Rol: ${input.role}` : '',
    `Usa Holded: ${input.usesHolded ? 'Sí' : 'No'}`,
    input.objective ? `Objetivo de la demo:\n${input.objective}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Nueva solicitud de demo: ${input.name} (${input.companyName})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="margin:0 0 12px;">Nueva solicitud de demo Holded</h2>
        <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin:0 0 8px;"><strong>Empresa:</strong> ${escapeHtml(input.companyName)}</p>
        ${extraRows}
        <p style="margin:0 0 8px;"><strong>Origen:</strong> ${escapeHtml(source)}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">ID solicitud: ${escapeHtml(input.id)}</p>
      </div>
    `.trim(),
    text: `Nueva solicitud de demo Holded\nNombre: ${input.name}\nEmail: ${input.email}\nEmpresa: ${input.companyName}\n${extraText}\nOrigen: ${source}\nID: ${input.id}`,
  };
}

// ── F5: emails del ciclo de vida operativo ──────────────────────────────────
// Estos templates cubren los eventos de la matriz F5 que tienen triggers
// sincronos en el codigo del MCP / endpoint comun:
//   - Primera actividad detectada (admin only)
//   - Borrador de factura creado via conector (admin only)
//   - Intentos de auth fallidos repetidos (personal + admin)
// Los eventos con triggers de background job (sin actividad 30 dias, API key
// revocada en Holded) viven en docs/engineering/HOLDED_CONNECTOR_BACKGROUND_EMAILS_RUNBOOK_2026.md.

type HoldedConnectorChannel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

function channelLabelFor(channel: HoldedConnectorChannel) {
  switch (channel) {
    case 'chatgpt':
      return 'ChatGPT';
    case 'mobile':
      return 'ChatGPT mobile';
    case 'claude':
      return 'Claude Desktop';
    case 'dashboard':
    default:
      return 'Panel';
  }
}

/**
 * F5: primera vez que un access token del MCP se usa con exito (transicion
 * de last_used_at NULL a NOT NULL). Solo email admin: el personal ya recibio
 * el email "conectado" en el upsert.
 */
export function buildHoldedFirstActivityAdminEmail(input: {
  companyName: string;
  userEmail: string;
  channel: HoldedConnectorChannel;
  toolUsed: string | null;
  detectedAt: Date;
  adminPanelUrl: string;
}): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel = channelLabelFor(input.channel);
  const detectedAt = input.detectedAt.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const tool = input.toolUsed?.trim() || '(consulta inicial)';

  return {
    subject: `[Holded Admin] Primera actividad — ${company} (${channelLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:22px 28px 14px;background:linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%);border-bottom:1px solid #d1fae5;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#047857;">Holded Admin · Primera actividad</span>
            <h1 style="font-size:20px;margin:6px 0 0;color:#0f172a;">${escapeHtml(company)} · ${escapeHtml(channelLabel)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">Detectamos la primera consulta exitosa al conector. La conexion esta operativa.</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              ${[
                ['Empresa', company],
                ['Usuario', input.userEmail],
                ['Canal', channelLabel],
                ['Primer tool usado', tool],
                ['Fecha', detectedAt],
              ]
                .map(
                  ([label, value]) => `
                <tr>
                  <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f1f5f9;width:35%;">${escapeHtml(label)}</td>
                  <td style="padding:9px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(value)}</td>
                </tr>`
                )
                .join('')}
            </table>
            <div style="margin-top:20px;">
              <a href="${escapeHtml(input.adminPanelUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:13px;">Ver en panel de admin</a>
            </div>
          </div>
        </div>
      </div>
    `.trim(),
    text: `[Holded Admin] Primera actividad detectada\nEmpresa: ${company}\nUsuario: ${input.userEmail}\nCanal: ${channelLabel}\nPrimer tool: ${tool}\nFecha: ${detectedAt}\n\nPanel: ${input.adminPanelUrl}`,
  };
}

/**
 * F5: cada vez que se ejecuta un tool de escritura (create_invoice_draft o
 * derivados). Pensado para que el admin de la empresa este al tanto de cualquier
 * borrador creado a traves del conector. El personal no recibe email aqui (lo
 * vio en la propia conversacion del LLM).
 */
export function buildHoldedInvoiceDraftCreatedAdminEmail(input: {
  companyName: string;
  userEmail: string;
  channel: HoldedConnectorChannel;
  draftId: string | null;
  draftNumber: string | null;
  contactName: string | null;
  total: number | null;
  currency: string | null;
  detectedAt: Date;
  adminPanelUrl: string;
}): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel = channelLabelFor(input.channel);
  const detectedAt = input.detectedAt.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const draftRef = input.draftNumber || input.draftId || '(sin numero)';
  const totalLabel =
    typeof input.total === 'number' && Number.isFinite(input.total)
      ? `${input.total.toFixed(2)} ${input.currency || 'EUR'}`
      : '(no informado)';

  return {
    subject: `[Holded Admin] Borrador de factura creado — ${company} (${channelLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:22px 28px 14px;background:linear-gradient(135deg,#fef3c7 0%,#fef9c3 100%);border-bottom:1px solid #fde68a;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#854d0e;">Holded Admin · Borrador de factura</span>
            <h1 style="font-size:20px;margin:6px 0 0;color:#0f172a;">${escapeHtml(company)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">Se ha creado un <strong>borrador de factura</strong> a traves del conector. El borrador queda en Holded como <em>draft</em>: no se ha emitido ni enviado.</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              ${[
                ['Empresa', company],
                ['Usuario', input.userEmail],
                ['Canal', channelLabel],
                ['Numero / ID', draftRef],
                ['Cliente', input.contactName || '(sin asignar)'],
                ['Total', totalLabel],
                ['Fecha', detectedAt],
              ]
                .map(
                  ([label, value]) => `
                <tr>
                  <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f1f5f9;width:35%;">${escapeHtml(label)}</td>
                  <td style="padding:9px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(value)}</td>
                </tr>`
                )
                .join('')}
            </table>
            <p style="margin:18px 0 0;font-size:12px;color:#64748b;">El conector nunca emite, finaliza ni envia facturas. Es decir, no emite y no envia documentos por ti. Para hacerlo, revisa el borrador en Holded y actualizalo manualmente.</p>
            <div style="margin-top:20px;">
              <a href="${escapeHtml(input.adminPanelUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:13px;">Ver en panel de admin</a>
            </div>
          </div>
        </div>
      </div>
    `.trim(),
    text: `[Holded Admin] Borrador de factura creado\nEmpresa: ${company}\nUsuario: ${input.userEmail}\nCanal: ${channelLabel}\nBorrador: ${draftRef}\nCliente: ${input.contactName || '(sin asignar)'}\nTotal: ${totalLabel}\nFecha: ${detectedAt}\n\nPanel: ${input.adminPanelUrl}`,
  };
}

/**
 * F5: 3+ intentos de auth fallidos en una ventana corta. Email al usuario
 * para que sepa que algo va mal con su conexion.
 */
export function buildHoldedAuthFailuresUserEmail(input: {
  name: string;
  companyName: string;
  channel: HoldedConnectorChannel;
  failureCount: number;
  windowMinutes: number;
  reconnectUrl: string;
  supportEmail: string;
}): EmailTemplate {
  const channelLabel = channelLabelFor(input.channel);
  const company = sanitizeCompanyName(input.companyName);

  return {
    subject: `Tu conector Holded esta fallando — ${channelLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          ${brandHeader('Hay un problema con tu conector')}
          <div style="padding:24px 28px;">
            <p style="margin:0 0 12px;font-size:15px;color:#0f172a;">${greeting(input.name)}</p>
            <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">Hemos detectado <strong>${input.failureCount} intentos de conexion fallidos</strong> con tu cuenta de Holded en los ultimos ${input.windowMinutes} minutos a traves de <strong>${escapeHtml(channelLabel)}</strong>.</p>
            <p style="margin:0 0 12px;font-size:14px;color:#0f172a;">Las causas mas frecuentes son:</p>
            <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#334155;">
              <li>La API key de Holded ha sido <strong>regenerada o revocada</strong> en el panel de Holded.</li>
              <li>Tu plan de Holded ha cambiado y ya no incluye acceso a la API.</li>
              <li>La cuenta de Holded esta suspendida o limitada temporalmente.</li>
            </ul>
            <p style="margin:0 0 16px;font-size:14px;color:#0f172a;">Reconecta el conector para que vuelva a funcionar:</p>
            <div>
              <a href="${escapeHtml(input.reconnectUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:700;font-size:14px;">Reconectar Holded</a>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#64748b;">Si crees que es un error o necesitas ayuda, escribenos a <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#1d9e75;">${escapeHtml(input.supportEmail)}</a>. Empresa: ${escapeHtml(company)}.</p>
          </div>
        </div>
      </div>
    `.trim(),
    text: `Tu conector Holded para ${channelLabel} esta fallando.\n\nHemos detectado ${input.failureCount} intentos de conexion fallidos en los ultimos ${input.windowMinutes} minutos.\n\nReconecta: ${input.reconnectUrl}\nSoporte: ${input.supportEmail}`,
  };
}

/**
 * F5: contraparte admin del email anterior. Se manda al admin empresa cuando
 * detectamos los mismos 3+ fallos en la ventana corta.
 */
export function buildHoldedAuthFailuresAdminEmail(input: {
  companyName: string;
  userEmail: string;
  channel: HoldedConnectorChannel;
  failureCount: number;
  windowMinutes: number;
  detectedAt: Date;
  adminPanelUrl: string;
}): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel = channelLabelFor(input.channel);
  const detectedAt = input.detectedAt.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return {
    subject: `[Holded Admin] Auth fallida — ${company} (${channelLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <div style="padding:22px 28px 14px;background:linear-gradient(135deg,#fee2e2 0%,#fef2f2 100%);border-bottom:1px solid #fecaca;">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b91c1c;">Holded Admin · Auth fallida</span>
            <h1 style="font-size:20px;margin:6px 0 0;color:#0f172a;">${escapeHtml(company)} · ${escapeHtml(channelLabel)}</h1>
          </div>
          <div style="padding:24px 28px;">
            <p style="margin:0 0 12px;font-size:14px;color:#0f172a;"><strong>${input.failureCount} intentos fallidos</strong> en los ultimos ${input.windowMinutes} minutos. Posibles causas: API key revocada, plan cambiado, cuenta suspendida.</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              ${[
                ['Empresa', company],
                ['Usuario', input.userEmail],
                ['Canal', channelLabel],
                ['Intentos fallidos', String(input.failureCount)],
                ['Ventana', `${input.windowMinutes} min`],
                ['Detectado', detectedAt],
              ]
                .map(
                  ([label, value]) => `
                <tr>
                  <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f1f5f9;width:35%;">${escapeHtml(label)}</td>
                  <td style="padding:9px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(value)}</td>
                </tr>`
                )
                .join('')}
            </table>
            <div style="margin-top:20px;">
              <a href="${escapeHtml(input.adminPanelUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:700;font-size:13px;">Ver en panel de admin</a>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#64748b;">Tambien hemos avisado al usuario por email para que reconecte cuanto antes.</p>
          </div>
        </div>
      </div>
    `.trim(),
    text: `[Holded Admin] Auth fallida\nEmpresa: ${company}\nUsuario: ${input.userEmail}\nCanal: ${channelLabel}\nIntentos: ${input.failureCount} en ${input.windowMinutes} min\nDetectado: ${detectedAt}\n\nPanel: ${input.adminPanelUrl}`,
  };
}
