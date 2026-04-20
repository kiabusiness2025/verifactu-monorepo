type LeadInput = {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
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
  channel?: 'dashboard' | 'chatgpt';
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
            Conector oficial
          </td>
        </tr>
      </table>
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
  return {
    subject: 'Tus 3 pasos para conectar Holded',
    html: cardLayout({
      label: 'Guia rapida',
      title: 'Conecta tu Holded en 3 minutos',
      body: `
        <ol style="padding-left:18px;margin:0 0 18px;">
          <li style="margin:0 0 8px;">Abre Holded y entra en el area de API.</li>
          <li style="margin:0 0 8px;">Copia una API key activa de tu empresa.</li>
          <li style="margin:0 0 8px;">Vuelve al onboarding del conector y pega la clave.</li>
        </ol>
        <p style="margin:0 0 16px;">En cuanto valides la clave, tendras contexto real para ventas, gastos, cobros y prioridades.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Ir al onboarding</a>
      `,
      footer: legalFooter(),
    }),
    text: `Tus 3 pasos para conectar Holded:\n1) Abre Holded y entra en API.\n2) Copia una API key activa.\n3) Pegala en el onboarding del conector.\n\nEmpieza aqui: https://holded.verifactu.business`,
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
  const primaryUrl = input.returnUrl || input.chatUrl;
  const primaryLabel = isChatgptFlow ? 'Volver a ChatGPT' : 'Abrir panel';
  const recommendedSteps = isChatgptFlow
    ? `
          <ol style="padding-left:18px;margin:0;">
            <li style="margin:0 0 6px;">Vuelve a ChatGPT para terminar la autorizacion.</li>
            <li style="margin:0 0 6px;">Prueba una consulta real con tus datos de Holded.</li>
            <li style="margin:0;">Si mas adelante necesitas soporte, responde a este correo.</li>
          </ol>
        `
    : `
          <ol style="padding-left:18px;margin:0;">
            <li style="margin:0 0 6px;">Abre tu panel principal.</li>
            <li style="margin:0 0 6px;">Revisa conexiones y estado de sincronizacion.</li>
            <li style="margin:0;">Completa datos de empresa pendientes para dejar la empresa verificada.</li>
          </ol>
        `;
  const secondaryCta = isChatgptFlow
    ? ''
    : `<a href="${escapeHtml(profileCompletionUrl)}" style="display:inline-block;margin-left:12px;background:#ffffff;color:#b4233c;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;border:1px solid #f3d0d7;">Completar datos</a>`;
  const nextStepsText = isChatgptFlow
    ? `Siguientes pasos:\n1) Vuelve a ChatGPT\n2) Prueba una consulta con tus datos\n3) Si necesitas ayuda, responde a este correo`
    : `Siguientes pasos:\n1) Abre tu panel\n2) Revisa conexiones y estado\n3) Completa datos de empresa pendientes para dejar la empresa verificada`;

  return {
    subject: `Holded conectado en ${company}`,
    html: cardLayout({
      label: 'Conexion activa',
      title: 'Holded + ChatGPT conectados',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">La conexion de Holded para <strong>${escapeHtml(company)}</strong> ya esta activa.</p>
        <p style="margin:0 0 18px;">Modulos validados: <strong>${escapeHtml(modules)}</strong>.</p>
        <div style="margin:0 0 18px;padding:16px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div style="font-weight:700;margin:0 0 8px;">Siguientes pasos recomendados</div>
          ${recommendedSteps}
        </div>
        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">${primaryLabel}</a>
        ${secondaryCta}
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nLa conexion de Holded para ${company} ya esta activa.\n\n${nextStepsText}\n\n${primaryLabel}: ${primaryUrl}${isChatgptFlow ? '' : `\nCompletar datos: ${profileCompletionUrl}`}`,
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
  const channelLabel = isChatgptFlow ? 'ChatGPT' : 'Dashboard';
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
        <a href="${escapeHtml(adminPanelUrl || 'https://admin.verifactu.business/dashboard/admin')}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;margin-right:10px;">Ver en panel admin</a>
      `,
      footer: legalFooter(),
    }),
    text: `[Holded] Nueva conexion activada\n\nEmpresa: ${company}\nEmail: ${input.email}\nCanal: ${channelLabel}\nModulos: ${modules}\nFecha: ${now}\n\nPanel admin: ${adminPanelUrl || 'https://admin.verifactu.business/dashboard/admin'}`,
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
    subject: 'Tu Holded ya esta conectado a ChatGPT',
    html: cardLayout({
      label: 'Primera conexion',
      title: 'Ya puedes usar Holded desde ChatGPT',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 18px;">Tu cuenta de Holded ya esta conectada. Puedes empezar ahora mismo haciendo preguntas como estas directamente en ChatGPT:</p>
        <div style="margin:0 0 22px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          ${promptRows}
        </div>
        <p style="margin:0 0 18px;font-size:13px;color:#64748b;">El conector accede a la API oficial de Holded. Solo prepara borradores de factura cuando tu lo confirmas explicitamente. Todo lo demas es lectura.</p>
        <a href="${escapeHtml(primaryUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;margin-right:10px;">Ir a ChatGPT ahora</a>
        <a href="${escapeHtml(input.profileCompletionUrl)}" style="display:inline-block;background:#ffffff;color:#b4233c;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;border:1px solid #f3d0d7;">Completar perfil</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Si necesitas ayuda, responde a este correo o escribe a <a href="mailto:soporte@verifactu.business" style="color:#b4233c;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nTu cuenta de Holded ya esta conectada a ChatGPT.\n\nPreguntas que puedes hacer ahora:\n${chatgptPromptExamples.map((p) => `• ${p}`).join('\n')}\n\nIr a ChatGPT: ${primaryUrl}\nCompletar perfil: ${input.profileCompletionUrl}`,
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
    subject: 'Personaliza tu conector de Holded (2 minutos)',
    html: cardLayout({
      label: 'Mejora tu experiencia',
      title: 'Cuentanos un poco sobre tu empresa',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 16px;">Completar tu perfil ayuda al conector a darte respuestas mas precisas y relevantes para tu negocio. Solo son 2 minutos.</p>
        <div style="margin:0 0 20px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;padding:6px 16px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${fieldRows}
          </table>
        </div>
        <p style="margin:0 0 18px;font-size:13px;color:#475569;">Todos los datos son opcionales. Puedes completar solo lo que quieras y editar en cualquier momento.</p>
        <a href="${escapeHtml(input.profileCompletionUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:700;">Completar perfil ahora</a>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nCompletar tu perfil ayuda al conector a darte respuestas mas precisas.\n\nCampos disponibles:\n${fields.map((f) => `• ${f.label}`).join('\n')}\n\nCompletar perfil: ${input.profileCompletionUrl}`,
  };
}

export function buildHoldedDisconnectedEmail(input: {
  name: string;
  companyName: string;
  channel: 'dashboard' | 'chatgpt';
  reconnectUrl: string;
}): EmailTemplate {
  const hello = greeting(input.name);
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel = input.channel === 'chatgpt' ? 'ChatGPT' : 'el dashboard';

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
  channel: 'dashboard' | 'chatgpt';
  adminPanelUrl: string;
}): EmailTemplate {
  const company = sanitizeCompanyName(input.companyName);
  const channelLabel = input.channel === 'chatgpt' ? 'ChatGPT' : 'Dashboard';
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
  newConnectionsByChannel: { chatgpt: number; dashboard: number };
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
      label: '— via Dashboard',
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
    text: `[Holded Admin] Resumen semanal — ${weekLabel}\n\nNuevas conexiones: ${newConnections} (ChatGPT: ${newConnectionsByChannel.chatgpt}, Dashboard: ${newConnectionsByChannel.dashboard})\nDesconexiones: ${disconnections}\nConexiones activas totales: ${totalActive}\n\nPanel de administracion: ${adminPanelUrl}`,
  };
}

export function buildHoldedInternalLeadEmail(input: LeadInput): EmailTemplate {
  const source = input.source?.trim() || 'holded_web';

  return {
    subject: `Nuevo lead Holded: ${input.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="margin:0 0 12px;">Nuevo lead en flujo Holded</h2>
        <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin:0 0 8px;"><strong>Empresa:</strong> ${escapeHtml(input.companyName)}</p>
        ${input.phone ? `<p style="margin:0 0 8px;"><strong>Telefono:</strong> ${escapeHtml(input.phone)}</p>` : ''}
        <p style="margin:0 0 8px;"><strong>Origen:</strong> ${escapeHtml(source)}</p>
      </div>
    `.trim(),
    text: `Nuevo lead Holded\nNombre: ${input.name}\nEmail: ${input.email}\nEmpresa: ${input.companyName}\n${input.phone ? `Telefono: ${input.phone}\n` : ''}Origen: ${source}`,
  };
}
