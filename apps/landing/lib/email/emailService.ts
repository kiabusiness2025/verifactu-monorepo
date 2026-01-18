/**
 * Email Service
 * Integraciones con Resend para enviar correos electrónicos
 */

import { VerifyEmailTemplate } from '../../emails/VerifyEmail';
import { WelcomeEmailTemplate } from '../../emails/WelcomeEmail';
import { ResetPasswordEmailTemplate } from '../../emails/ResetPasswordEmail';
import { PasswordChangedEmailTemplate } from '../../emails/PasswordChangedEmail';
import { TeamInviteEmailTemplate } from '../../emails/TeamInviteEmail';

// Importar Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Alias de emails según contexto
const EMAIL_FROM_SUPPORT = process.env.RESEND_FROM_SUPPORT || 'Verifactu Business <soporte@verifactu.business>';
const EMAIL_FROM_NOREPLY = process.env.RESEND_FROM_NOREPLY || 'Verifactu Business <noreply@verifactu.business>';
const EMAIL_FROM_INFO = process.env.RESEND_FROM_INFO || 'Verifactu Business <info@verifactu.business>';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Función para convertir React component a HTML string
 * Usa renderización simple del componente React
 */
function renderComponentToHtml(component: React.ReactElement): string {
  // Para usar con React Server Components, necesitaremos una solución diferente
  // Por ahora, retornamos un placeholder que será reemplazado
  // En producción, se usaría react-email/render o similar
  return '';
}

/**
 * Función auxiliar para enviar email via Resend
 */
async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY no está configurado');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    // Usar Resend para enviar
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM_NOREPLY,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error sending email via Resend:', error);
      return { success: false, error };
    }

    const data = await response.json();
    console.log('[📧 EMAIL] Sent successfully:', { to, subject, messageId: data.id });
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[📧 EMAIL] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Enviar email de verificación
 */
export async function sendVerificationEmail({
  email,
  userName,
  verificationLink,
}: {
  email: string;
  userName: string;
  verificationLink: string;
}) {
  // Para desarrollo, usamos un template HTML simple
  // En producción, se podría usar una solución como React Email
  const html = generateVerificationEmailHtml({
    email,
    verificationLink,
    userName,
  });

  return sendEmail({
    to: email,
    subject: '✨ Verifica tu correo en Verifactu Business',
    html,
  });
}

/**
 * Enviar email de bienvenida
 */
export async function sendWelcomeEmail({
  userName,
  email,
  dashboardLink,
}: {
  userName: string;
  email: string;
  dashboardLink: string;
}) {
  const html = generateWelcomeEmailHtml({
    userName,
    email,
    dashboardLink,
  });

  return sendEmail({
    to: email,
    subject: '🎉 ¡Bienvenido a Verifactu Business!',
    html,
  });
}

/**
 * Enviar email de recuperación de contraseña
 */
export async function sendResetPasswordEmail({
  userName,
  email,
  resetLink,
  expiryMinutes = 60,
}: {
  userName: string;
  email: string;
  resetLink: string;
  expiryMinutes?: number;
}) {
  const html = generateResetPasswordEmailHtml({
    userName,
    resetLink,
    expiryMinutes,
  });

  return sendEmail({
    to: email,
    subject: '🔐 Restablecer tu contraseña en Verifactu Business',
    html,
  });
}

/**
 * Enviar confirmación de cambio de contraseña
 */
export async function sendPasswordChangedEmail({
  userName,
  email,
  dashboardLink,
}: {
  userName: string;
  email: string;
  dashboardLink: string;
}) {
  const html = generatePasswordChangedEmailHtml({
    userName,
    dashboardLink,
  });

  return sendEmail({
    to: email,
    subject: '✅ Tu contraseña ha sido actualizada',
    html,
  });
}

/**
 * Enviar invitación a equipo
 */
export async function sendTeamInviteEmail({
  inviteeEmail,
  inviterName,
  companyName,
  acceptLink,
  role = 'miembro del equipo',
}: {
  inviteeEmail: string;
  inviterName: string;
  companyName: string;
  acceptLink: string;
  role?: string;
}) {
  const html = generateTeamInviteEmailHtml({
    inviteeEmail,
    inviterName,
    companyName,
    acceptLink,
    role,
  });

  return sendEmail({
    to: inviteeEmail,
    subject: `👋 ${inviterName} te ha invitado a colaborar en ${companyName}`,
    html,
  });
}

/**
 * Email genérico
 */
export async function sendCustomEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendEmail({ to, subject, html });
}

// ============================================================================
// Generadores de HTML para emails
// ============================================================================

function generateEmailHeader(): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; color:#1b2a3a; margin-bottom: 32px; border-bottom: 1px solid #e0e6eb; padding-bottom: 24px;">
      <tr>
        <td style="padding-right:16px; vertical-align:middle;">
          <img src="https://verifactu.business/brand/logo-horizontal-light.png" width="140" alt="Verifactu Business" style="display:block; border:0; outline:none;">
        </td>
        <td style="vertical-align:middle;">
          <div style="font-size:14px; font-weight:bold; color:#0d2b4a;">Soporte | Verifactu Business</div>
          <div style="font-size:13px; color:#1b2a3a; margin-top:4px;">soporte@verifactu.business</div>
          <div style="font-size:13px; color:#1b2a3a; margin-top:2px;">verifactu.business</div>
          <div style="font-size:11px; color:#6b7c8a; margin-top:8px;">Registro de usuarios y comunicaciones generales</div>
        </td>
      </tr>
    </table>
  `;
}

function generateEmailFooter(): string {
  const currentYear = new Date().getFullYear();
  return `
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e0e6eb; font-size: 12px; color: #6b7c8a; text-align: center;">
      <p style="margin: 0 0 8px 0;">© ${currentYear} Verifactu Business. Todos los derechos reservados.</p>
      <p style="margin: 0 0 12px 0; line-height: 1.6;">Si tienes preguntas, contáctanos en <a href="mailto:soporte@verifactu.business" style="color: #0060F0; text-decoration: none;">soporte@verifactu.business</a></p>
      <p style="margin: 0; font-size: 11px; color: #9ca8b3;">
        <a href="https://verifactu.business/privacy" style="color: #6b7c8a; text-decoration: none; margin-right: 16px;">Política de privacidad</a>
        <a href="https://verifactu.business/terms" style="color: #6b7c8a; text-decoration: none;">Términos de servicio</a>
      </p>
    </div>
  `;
}

function wrapEmail(content: string): string {
  return `
    <!DOCTYPE html>
    <html style="font-family: Arial, sans-serif;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 32px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(13, 43, 74, 0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 24px;">
              ${generateEmailHeader()}
              ${content}
              ${generateEmailFooter()}
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

function generateVerificationEmailHtml({
  email,
  verificationLink,
  userName,
}: {
  email: string;
  verificationLink: string;
  userName: string;
}): string {
  const content = `
    <h1 style="font-size: 24px; font-weight: bold; color: #0d2b4a; margin: 0 0 16px 0; line-height: 1.3;">
      ✨ ¡Casi listo, ${userName}!
    </h1>
    <p style="font-size: 16px; color: #1b2a3a; margin: 0 0 24px 0; line-height: 1.6;">
      Bienvenido a <strong>Verifactu Business</strong>. Solo necesitamos verificar tu correo electrónico para completar tu registro.
    </p>

    <div style="background-color: #f0f3f7; border-left: 4px solid #0060F0; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="font-size: 14px; color: #0d2b4a; margin: 0; line-height: 1.5;">
        💡 <strong>Una vez confirmado tu email:</strong> Podrás acceder al dashboard, crear tu primer proyecto y comenzar a trabajar con tranquilidad en tu contabilidad.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #0060F0; padding: 12px 24px; text-align: center;">
          <a href="${verificationLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; font-family: Arial, sans-serif;">
            Verificar mi correo
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6;">
      O copia este enlace en tu navegador:
      <br>
      <code style="display: block; background-color: #f8f9fa; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; word-break: break-all; color: #0060F0;">
        ${verificationLink}
      </code>
    </p>

    <div style="background-color: #f9fafc; padding: 16px; border-radius: 6px; margin-top: 24px;">
      <p style="font-size: 13px; color: #1b2a3a; margin: 0 0 8px 0; line-height: 1.5;">
        <strong>🛡️ Tu seguridad es importante:</strong>
      </p>
      <ul style="font-size: 13px; color: #1b2a3a; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
        <li>Este enlace expira en 24 horas</li>
        <li>Nunca compartiremos tu información con terceros</li>
        <li>Tu contraseña está encriptada y segura</li>
      </ul>
    </div>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
      ¿Problemas para verificar tu correo? <a href="mailto:soporte@verifactu.business?subject=Problemas%20con%20verificaci%C3%B3n%20de%20correo" style="color: #0060F0; text-decoration: none;">Contáctanos</a>
    </p>
  `;

  return wrapEmail(content);
}

function generateWelcomeEmailHtml({
  userName,
  email,
  dashboardLink,
}: {
  userName: string;
  email: string;
  dashboardLink: string;
}): string {
  const content = `
    <h1 style="font-size: 28px; font-weight: bold; color: #0d2b4a; margin: 0 0 16px 0; line-height: 1.2;">
      🎉 ¡Bienvenido, ${userName}!
    </h1>
    <p style="font-size: 16px; color: #1b2a3a; margin: 0 0 24px 0; line-height: 1.6;">
      Tu cuenta en <strong>Verifactu Business</strong> está lista. A partir de ahora, puedes gestionar tu contabilidad con total confianza.
    </p>

    <div style="background-color: #e8f4ff; border-left: 4px solid #0060F0; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="font-size: 14px; color: #0d2b4a; margin: 0; line-height: 1.6; font-weight: 500;">
        💝 <strong>Acceso inmediato a:</strong>
      </p>
      <ul style="font-size: 14px; color: #0d2b4a; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
        <li>📊 Dashboard intuitivo con métricas en tiempo real</li>
        <li>📝 Gestión de facturas y documentos</li>
        <li>🔍 Análisis fiscal simplificado</li>
        <li>🛡️ Cumplimiento automático de normativa</li>
        <li>💬 Asistente Isaak disponible 24/7</li>
      </ul>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #0060F0; padding: 12px 24px; text-align: center;">
          <a href="${dashboardLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; font-family: Arial, sans-serif;">
            Ir al Dashboard
          </a>
        </td>
      </tr>
    </table>

    <h3 style="font-size: 16px; font-weight: bold; color: #0d2b4a; margin: 32px 0 16px 0;">
      📚 Primeros pasos recomendados:
    </h3>

    <div style="margin-bottom: 16px;">
      <p style="font-size: 14px; font-weight: 600; color: #1b2a3a; margin: 0 0 6px 0;">1️⃣ Completa tu perfil de empresa</p>
      <p style="font-size: 13px; color: #6b7c8a; margin: 0; line-height: 1.5;">
        Nos ayudará a personalizar tu experiencia y ofrecer recomendaciones precisas.
      </p>
    </div>

    <div style="margin-bottom: 16px;">
      <p style="font-size: 14px; font-weight: 600; color: #1b2a3a; margin: 0 0 6px 0;">2️⃣ Conecta tus cuentas bancarias (opcional)</p>
      <p style="font-size: 13px; color: #6b7c8a; margin: 0; line-height: 1.5;">
        Automatiza el registro de transacciones. Tus datos están 100% protegidos.
      </p>
    </div>

    <div>
      <p style="font-size: 14px; font-weight: 600; color: #1b2a3a; margin: 0 0 6px 0;">3️⃣ Explora el asistente Isaak</p>
      <p style="font-size: 13px; color: #6b7c8a; margin: 0; line-height: 1.5;">
        Pregunta cualquier cosa sobre tu contabilidad. Está diseñado para tranquilizarte.
      </p>
    </div>

    <div style="background-color: #f9fafc; padding: 16px; border-radius: 6px; margin-top: 24px;">
      <p style="font-size: 13px; color: #1b2a3a; margin: 0; line-height: 1.6;">
        <strong>🌟 Dato curioso:</strong> Los usuarios que completan su perfil en los primeros 7 días reportan un 3x más confianza en sus finanzas. ¡Tú también puedes!
      </p>
    </div>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
      ¿Necesitas ayuda? <a href="mailto:soporte@verifactu.business" style="color: #0060F0; text-decoration: none;">Nuestro equipo está aquí</a>. Respondemos en menos de 2 horas.
    </p>
  `;

  return wrapEmail(content);
}

function generateResetPasswordEmailHtml({
  userName,
  resetLink,
  expiryMinutes,
}: {
  userName: string;
  resetLink: string;
  expiryMinutes: number;
}): string {
  const content = `
    <h1 style="font-size: 24px; font-weight: bold; color: #0d2b4a; margin: 0 0 16px 0; line-height: 1.3;">
      🔐 Restablecer tu contraseña
    </h1>
    <p style="font-size: 16px; color: #1b2a3a; margin: 0 0 24px 0; line-height: 1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Verifactu Business. No te preocupes, esto es seguro y solo tú puedes completar este proceso.
    </p>

    <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="font-size: 14px; color: #0d2b4a; margin: 0; line-height: 1.5;">
        ⏱️ <strong>Este enlace expira en ${expiryMinutes} minutos.</strong> Si no solicitaste este cambio, puedes ignorar este email.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #0060F0; padding: 12px 24px; text-align: center;">
          <a href="${resetLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; font-family: Arial, sans-serif;">
            Restablecer contraseña
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6;">
      O copia este enlace en tu navegador:
      <br>
      <code style="display: block; background-color: #f8f9fa; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; word-break: break-all; color: #0060F0;">
        ${resetLink}
      </code>
    </p>

    <div style="background-color: #f0f3f7; padding: 16px; border-radius: 6px; margin-top: 24px;">
      <p style="font-size: 13px; color: #1b2a3a; margin: 0 0 12px 0; line-height: 1.5;">
        <strong>✅ Consejos de seguridad:</strong>
      </p>
      <ul style="font-size: 13px; color: #1b2a3a; margin: 0; padding-left: 20px; line-height: 1.7;">
        <li>Elige una contraseña única y segura</li>
        <li>Combina mayúsculas, minúsculas, números y símbolos</li>
        <li>Evita datos personales (nombres, fechas de nacimiento)</li>
        <li>Si usas gestor de contraseñas, es aún mejor</li>
      </ul>
    </div>

    <div style="background-color: #e8f4ff; border-left: 4px solid #0060F0; padding: 16px; border-radius: 4px; margin-top: 24px;">
      <p style="font-size: 13px; color: #0d2b4a; margin: 0; line-height: 1.6;">
        💡 <strong>Recuerda:</strong> Una vez cambies tu contraseña, tendrás acceso inmediato a tu dashboard y todos tus datos seguirán intactos. Nada se pierde.
      </p>
    </div>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6;">
      <strong>¿Problemas para restablecer tu contraseña?</strong>
      <br>
      Si el enlace no funciona o necesitas ayuda, escribe a <a href="mailto:soporte@verifactu.business?subject=Problemas%20con%20recuperaci%C3%B3n%20de%20contrase%C3%B1a" style="color: #0060F0; text-decoration: none;">soporte@verifactu.business</a>
    </p>
  `;

  return wrapEmail(content);
}

function generatePasswordChangedEmailHtml({
  userName,
  dashboardLink,
}: {
  userName: string;
  dashboardLink: string;
}): string {
  const content = `
    <h1 style="font-size: 24px; font-weight: bold; color: #0d2b4a; margin: 0 0 16px 0; line-height: 1.3;">
      ✅ Contraseña actualizada
    </h1>
    <p style="font-size: 16px; color: #1b2a3a; margin: 0 0 24px 0; line-height: 1.6;">
      Tu contraseña en Verifactu Business ha sido cambiada exitosamente. Tu cuenta está segura.
    </p>

    <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="font-size: 14px; color: #0d2b4a; margin: 0; line-height: 1.5;">
        🛡️ <strong>Tu cuenta está protegida.</strong> Ahora puedes acceder con tu nueva contraseña.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #0060F0; padding: 12px 24px; text-align: center;">
          <a href="${dashboardLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; font-family: Arial, sans-serif;">
            Ir a mi Dashboard
          </a>
        </td>
      </tr>
    </table>

    <div style="background-color: #f9fafc; padding: 16px; border-radius: 6px; margin-top: 24px;">
      <p style="font-size: 13px; color: #1b2a3a; margin: 0 0 12px 0; line-height: 1.5;">
        <strong>📋 Información de seguridad:</strong>
      </p>
      <ul style="font-size: 13px; color: #1b2a3a; margin: 0; padding-left: 20px; line-height: 1.7;">
        <li>Cambio de contraseña confirmado en: ${new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}</li>
        <li>Dirección IP del cambio: Se registró para tu seguridad</li>
        <li>Todos tus datos siguen intactos y protegidos</li>
      </ul>
    </div>

    <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; border-radius: 4px; margin-top: 24px;">
      <p style="font-size: 13px; color: #0d2b4a; margin: 0 0 8px 0; line-height: 1.5;">
        <strong>⚠️ Si no fuiste tú quien realizó este cambio:</strong>
      </p>
      <p style="font-size: 13px; color: #0d2b4a; margin: 0; line-height: 1.5;">
        Contacta inmediatamente a <a href="mailto:soporte@verifactu.business?subject=URGENTE:%20Cambio%20de%20contrase%C3%B1a%20no%20autorizado" style="color: #ff9800; font-weight: bold; text-decoration: none;">soporte@verifactu.business</a>. Tomaremos acción inmediata para proteger tu cuenta.
      </p>
    </div>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6; text-align: center;">
      <strong>💡 Recuerda:</strong> Nunca compartiremos tu contraseña contigo por email. Si alguien te pide tu contraseña, es un intento de fraude.
    </p>
  `;

  return wrapEmail(content);
}

function generateTeamInviteEmailHtml({
  inviteeEmail,
  inviterName,
  companyName,
  acceptLink,
  role,
}: {
  inviteeEmail: string;
  inviterName: string;
  companyName: string;
  acceptLink: string;
  role: string;
}): string {
  const content = `
    <h1 style="font-size: 24px; font-weight: bold; color: #0d2b4a; margin: 0 0 16px 0; line-height: 1.3;">
      👋 ¡Te han invitado a colaborar!
    </h1>
    <p style="font-size: 16px; color: #1b2a3a; margin: 0 0 24px 0; line-height: 1.6;">
      <strong>${inviterName}</strong> te ha invitado a unirte a <strong>${companyName}</strong> en Verifactu Business como <strong>${role}</strong>.
    </p>

    <div style="background-color: #e8f4ff; border-left: 4px solid #0060F0; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      <p style="font-size: 14px; color: #0d2b4a; margin: 0; line-height: 1.6;">
        ✨ <strong>Desde aquí podrán:</strong>
      </p>
      <ul style="font-size: 14px; color: #0d2b4a; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
        <li>Colaborar en facturas y documentos</li>
        <li>Ver reportes y análisis fiscal</li>
        <li>Trabajar en equipo con total seguridad</li>
        <li>Mantener todo organizado y actualizado</li>
      </ul>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #0060F0; padding: 12px 24px; text-align: center;">
          <a href="${acceptLink}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; font-family: Arial, sans-serif;">
            Aceptar invitación
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6;">
      O copia este enlace en tu navegador:
      <br>
      <code style="display: block; background-color: #f8f9fa; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; word-break: break-all; color: #0060F0;">
        ${acceptLink}
      </code>
    </p>

    <div style="background-color: #f9fafc; padding: 16px; border-radius: 6px; margin-top: 24px;">
      <p style="font-size: 13px; color: #1b2a3a; margin: 0 0 8px 0; line-height: 1.5;">
        <strong>📝 Detalles de la invitación:</strong>
      </p>
      <ul style="font-size: 13px; color: #1b2a3a; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.7;">
        <li>Email: ${inviteeEmail}</li>
        <li>Empresa: ${companyName}</li>
        <li>Rol: ${role}</li>
        <li>Invitado por: ${inviterName}</li>
      </ul>
    </div>

    <div style="background-color: #f0f3f7; border-left: 4px solid #0060F0; padding: 16px; border-radius: 4px; margin-top: 24px;">
      <p style="font-size: 13px; color: #0d2b4a; margin: 0; line-height: 1.6;">
        🔒 <strong>Privacidad garantizada:</strong> Solo verás la información que ${inviterName} decida compartir contigo. Cada rol tiene permisos específicos.
      </p>
    </div>

    <p style="font-size: 13px; color: #6b7c8a; margin: 24px 0 0 0; line-height: 1.6;">
      <strong>¿Dudas sobre esta invitación?</strong>
      <br>
      Contacta directamente a ${inviterName} o escribe a <a href="mailto:soporte@verifactu.business" style="color: #0060F0; text-decoration: none;">soporte@verifactu.business</a>
    </p>
  `;

  return wrapEmail(content);
}
