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

function holdedSiteUrl() {
  return process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() || 'https://holded.verifactu.business';
}

function brandHeader(label: string) {
  const siteUrl = holdedSiteUrl();
  const holdedLogo = `${siteUrl}/brand/holded/holded-diamond-logo.png`;
  const isaakAvatar = `${siteUrl}/Isaak/isaak-avatar-holded.png`;

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
          <td align="right" style="vertical-align:middle;">
            <img src="${isaakAvatar}" alt="Isaak" width="52" height="52" style="display:block;border-radius:16px;border:1px solid #f3d0d7;background:#fff;" />
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
    subject: 'Bienvenido a Isaak para Holded',
    html: cardLayout({
      label: 'Isaak para Holded',
      title: 'Tu acceso gratuito ya esta preparado',
      body: `
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">Gracias por empezar con <strong>Isaak para Holded</strong>. Ya puedes conectar tu empresa <strong>${escapeHtml(input.companyName)}</strong> y empezar a trabajar con tus datos reales.</p>
        <p style="margin:0 0 18px;">Si quieres, responde a este correo y te ayudamos paso a paso en menos de 24h.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Continuar onboarding</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:13px;color:#475569;margin:0;">Soporte: <a href="mailto:soporte@verifactu.business" style="color:#b4233c;">soporte@verifactu.business</a></p>
      `,
      footer: legalFooter(),
    }),
    text: `${hello}\n\nGracias por empezar con Isaak para Holded. Tu acceso gratuito para ${input.companyName} ya esta preparado.\n\nContinua aqui: https://holded.verifactu.business\n\nSi necesitas ayuda, responde a este correo o escribe a soporte@verifactu.business.`,
  };
}

export function buildHoldedOnboardingGuideEmail(input: LeadInput): EmailTemplate {
  return {
    subject: 'Tus 3 pasos para conectar Holded con Isaak',
    html: cardLayout({
      label: 'Guia rapida',
      title: 'Conecta tu Holded en 3 minutos',
      body: `
        <ol style="padding-left:18px;margin:0 0 18px;">
          <li style="margin:0 0 8px;">Abre Holded y entra en el area de API.</li>
          <li style="margin:0 0 8px;">Copia una API key activa de tu empresa.</li>
          <li style="margin:0 0 8px;">Vuelve al onboarding de Isaak y pega la clave.</li>
        </ol>
        <p style="margin:0 0 16px;">En cuanto valides la clave, tendras contexto real para ventas, gastos, cobros y prioridades.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Ir al onboarding</a>
      `,
      footer: legalFooter(),
    }),
    text: `Tus 3 pasos para conectar Holded con Isaak:\n1) Abre Holded y entra en API.\n2) Copia una API key activa.\n3) Pegala en el onboarding de Isaak.\n\nEmpieza aqui: https://holded.verifactu.business`,
  };
}

export function buildHoldedVerificationEmail(input: {
  email: string;
  verificationUrl: string;
}): EmailTemplate {
  return {
    subject: 'Confirma tu correo para activar Isaak para Holded',
    html: cardLayout({
      label: 'Activa tu acceso',
      title: 'Un paso mas para empezar',
      body: `
        <p style="margin:0 0 14px;">Hemos creado tu acceso con <strong>${escapeHtml(input.email)}</strong>.</p>
        <p style="margin:0 0 18px;">Confirma tu correo y despues podras iniciar sesion para conectar Holded y empezar a trabajar con Isaak.</p>
        <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      `,
      footer: legalFooter(),
    }),
    text: `Confirma tu correo para activar Isaak para Holded.\n\nEmail: ${input.email}\n\nVerificar: ${input.verificationUrl}`,
  };
}

export function buildHoldedAccessReadyEmail(input: AccessEmailInput): EmailTemplate {
  return {
    subject: 'Tu acceso a Isaak para Holded ya esta activo',
    html: cardLayout({
      label: 'Acceso confirmado',
      title: 'Ya puedes entrar y conectar Holded',
      body: `
        <p style="margin:0 0 14px;">Tu correo <strong>${escapeHtml(input.email)}</strong> ya esta verificado.</p>
        <p style="margin:0 0 18px;">Entra ahora en tu acceso, conecta tu API key de Holded y te llevamos directo a Isaak para empezar con ventas, gastos y facturas.</p>
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Entrar ahora</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Despues de conectar Holded, entraras directamente en tu espacio principal de Isaak.</p>
      `,
      footer: legalFooter(),
    }),
    text: `Tu acceso a Isaak para Holded ya esta activo.\n\nEmail: ${input.email}\n\nEntrar: ${input.accessUrl}\n\nDespues de conectar Holded, entraras directamente en tu espacio principal de Isaak.`,
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
