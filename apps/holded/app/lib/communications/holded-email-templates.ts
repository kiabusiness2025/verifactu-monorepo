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

function legalFooter() {
  return `
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
      Powered by <a href="https://verifactu.business" style="color:#b4233c;">verifactu.business</a> ·
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
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#ffecef;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">Isaak para Holded</div>
        <h1 style="font-size:28px;line-height:1.2;margin:16px 0 8px;">Tu acceso gratuito ya está preparado</h1>
        <p style="margin:0 0 14px;">${escapeHtml(hello)}</p>
        <p style="margin:0 0 14px;">Gracias por empezar con <strong>Isaak para Holded</strong>. Ya puedes conectar tu empresa <strong>${escapeHtml(input.companyName)}</strong> y empezar a trabajar con tus datos reales.</p>
        <p style="margin:0 0 18px;">Si quieres, responde a este correo y te ayudamos paso a paso en menos de 24h.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Continuar onboarding</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <p style="font-size:13px;color:#475569;margin:0;">Soporte: <a href="mailto:soporte@holded.verifactu.business" style="color:#b4233c;">soporte@holded.verifactu.business</a></p>
        ${legalFooter()}
      </div>
    `.trim(),
    text: `${hello}\n\nGracias por empezar con Isaak para Holded. Tu acceso gratuito para ${input.companyName} ya está preparado.\n\nContinúa aquí: https://holded.verifactu.business\n\nSi necesitas ayuda, responde a este correo o escribe a soporte@holded.verifactu.business.`,
  };
}

export function buildHoldedOnboardingGuideEmail(input: LeadInput): EmailTemplate {
  return {
    subject: 'Tus 3 pasos para conectar Holded con Isaak',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#eef4ff;color:#1f55c0;font-size:12px;font-weight:700;letter-spacing:0.04em;">Guía rápida</div>
        <h1 style="font-size:26px;line-height:1.25;margin:16px 0 8px;">Conecta tu Holded en 3 minutos</h1>
        <ol style="padding-left:18px;margin:0 0 18px;">
          <li style="margin:0 0 8px;">Abre Holded y entra en el área de API.</li>
          <li style="margin:0 0 8px;">Copia una API key activa de tu empresa.</li>
          <li style="margin:0 0 8px;">Vuelve al onboarding de Isaak y pega la clave.</li>
        </ol>
        <p style="margin:0 0 16px;">En cuanto valides la clave, tendrás contexto real para ventas, gastos, cobros y prioridades.</p>
        <a href="https://holded.verifactu.business" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Ir al onboarding</a>
        ${legalFooter()}
      </div>
    `.trim(),
    text: `Tus 3 pasos para conectar Holded con Isaak:\n1) Abre Holded y entra en API.\n2) Copia una API key activa.\n3) Pégala en el onboarding de Isaak.\n\nEmpieza aquí: https://holded.verifactu.business`,
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
        ${input.phone ? `<p style="margin:0 0 8px;"><strong>Teléfono:</strong> ${escapeHtml(input.phone)}</p>` : ''}
        <p style="margin:0 0 8px;"><strong>Origen:</strong> ${escapeHtml(source)}</p>
      </div>
    `.trim(),
    text: `Nuevo lead Holded\nNombre: ${input.name}\nEmail: ${input.email}\nEmpresa: ${input.companyName}\n${input.phone ? `Teléfono: ${input.phone}\n` : ''}Origen: ${source}`,
  };
}
