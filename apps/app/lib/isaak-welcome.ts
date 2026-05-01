/**
 * Isaak Welcome Email
 * Sent to new native users on first registration (non-Holded users).
 * Called best-effort from /api/auth/sync-user when created = true.
 */

type WelcomeEmailInput = {
  email: string;
  name?: string;
};

function cleanEnv(value?: string | null) {
  return value?.replace(/[\r\n]/g, '').trim() || '';
}

function buildHtml(name: string | undefined, appUrl: string): string {
  const greeting = name ? `Hola, ${name.split(' ')[0]}` : 'Hola';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;background:#2361d8;border-radius:12px;display:inline-flex;align-items:center;justify-content:center">
              <span style="color:white;font-size:20px;line-height:1">✦</span>
            </div>
            <span style="font-size:20px;font-weight:700;color:#011c67;vertical-align:middle">Isaak</span>
          </div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:white;border-radius:24px;border:1px solid #e2e8f0;padding:40px;box-shadow:0 4px 24px rgba(15,23,42,0.06)">

          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#011c67">
            ${greeting} — bienvenido a Isaak
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7">
            Tu cuenta ya está lista. Isaak es tu asistente fiscal inteligente que conecta con tu contabilidad real para ayudarte a entender tus datos sin tecnicismos.
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            ${[
              [
                '1',
                'Accede a tu panel',
                'Inicia sesión para ver tu dashboard con ventas, gastos y beneficio en tiempo real.',
              ],
              [
                '2',
                'Conecta tu contabilidad',
                'Vincula tu ERP o importa tus datos. Isaak se encarga del resto.',
              ],
              [
                '3',
                'Pregunta lo que quieras',
                'Escríbele a Isaak en lenguaje natural. Sin formularios, sin tablas difíciles.',
              ],
            ]
              .map(
                ([num, title, desc]) => `
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:14px;vertical-align:top">
                  <div style="width:28px;height:28px;background:#2361d8;border-radius:8px;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:white">${num}</div>
                </td>
                <td style="vertical-align:top">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a">${title}</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`
              )
              .join('')}
          </table>

          <!-- CTA -->
          <a href="${appUrl}/dashboard/isaak" style="display:block;text-align:center;background:#2361d8;color:white;font-weight:600;font-size:15px;padding:14px 24px;border-radius:12px;text-decoration:none;margin-bottom:20px">
            Abrir Isaak →
          </a>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center">
            Si tienes alguna duda, escríbenos a <a href="mailto:soporte@verifactu.business" style="color:#2361d8;text-decoration:none">soporte@verifactu.business</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            Verifactu Business · <a href="https://verifactu.business" style="color:#94a3b8">verifactu.business</a>
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">
            Recibiste este correo porque creaste una cuenta en Verifactu Business.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(name: string | undefined, appUrl: string): string {
  const greeting = name ? `Hola, ${name.split(' ')[0]}` : 'Hola';
  return `${greeting} — bienvenido a Isaak

Tu cuenta ya está lista.

Isaak es tu asistente fiscal inteligente. Accede a tu panel:
${appUrl}/dashboard/isaak

Siguientes pasos:
1. Accede a tu panel y revisa tu dashboard
2. Conecta tu contabilidad o importa tus datos
3. Pregunta a Isaak lo que necesites en lenguaje natural

¿Dudas? Escríbenos a soporte@verifactu.business

Verifactu Business · verifactu.business`;
}

export async function sendIsaakWelcomeEmail({ email, name }: WelcomeEmailInput): Promise<void> {
  const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!resendApiKey) {
    console.warn('[isaak-welcome] RESEND_API_KEY not set, skipping welcome email');
    return;
  }

  const from = cleanEnv(process.env.RESEND_FROM) || 'Isaak <noreply@verifactu.business>';
  const appUrl = cleanEnv(process.env.NEXT_PUBLIC_APP_URL) || 'https://app.verifactu.business';

  const html = buildHtml(name, appUrl);
  const text = buildText(name, appUrl);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Bienvenido a Isaak${name ? `, ${name.split(' ')[0]}` : ''}`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[isaak-welcome] Resend error ${res.status}: ${body}`);
  }
}
