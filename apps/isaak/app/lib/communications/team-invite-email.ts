/**
 * Team invite email — sent when a workspace admin invites a new member.
 */

import { Resend } from 'resend';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function resolveSender() {
  return (
    cleanEnv(process.env.RESEND_FROM_ISAAK) ||
    cleanEnv(process.env.RESEND_FROM) ||
    `Isaak <no-reply@${new URL(ISAAK_PUBLIC_URL).hostname}>`
  );
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function legalFooter() {
  return `
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
      Powered by <a href="https://verifactu.business" style="color:#2361d8;">verifactu.business</a> ·
      <a href="https://app.verifactu.business/privacy" style="color:#2361d8;">Privacidad</a> ·
      <a href="https://app.verifactu.business/terms" style="color:#2361d8;">Términos</a>
    </p>`.trim();
}

export type SendTeamInviteEmailInput = {
  inviteeEmail: string;
  inviterName: string | null;
  companyName: string | null;
  inviteToken: string;
  role: string;
};

export async function sendTeamInviteEmail(input: SendTeamInviteEmailInput): Promise<void> {
  const resendKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!resendKey) {
    console.warn('[team-invite] RESEND_API_KEY not set — skipping email');
    return;
  }

  const acceptUrl = `${ISAAK_PUBLIC_URL}/api/team/accept?token=${encodeURIComponent(input.inviteToken)}`;
  const company = input.companyName || 'tu empresa';
  const inviter = input.inviterName || 'Un miembro del equipo';
  const roleLabel = input.role === 'admin' ? 'administrador' : 'miembro';

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f0f4ff;">
      <div style="background:#fff;border:1px solid #c7d7f7;border-radius:24px;padding:28px;box-shadow:0 18px 40px rgba(15,23,42,0.06);">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.04em;">Invitación al equipo</div>
        <h1 style="font-size:26px;line-height:1.2;margin:16px 0 12px;color:#011c67;">Te han invitado a Isaak 🎉</h1>
        <p style="margin:0 0 14px;"><strong>${escapeHtml(inviter)}</strong> te ha invitado a unirte al espacio de trabajo de <strong>${escapeHtml(company)}</strong> en Isaak como <strong>${escapeHtml(roleLabel)}</strong>.</p>
        <p style="margin:0 0 20px;">Isaak es el copiloto fiscal e IA de tu empresa — conectado con el ERP, bancos, calendario y más.</p>
        <a href="${acceptUrl}" style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">Aceptar invitación →</a>
        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">Este enlace es válido durante 7 días. Si no esperabas esta invitación, puedes ignorarlo.</p>
        ${legalFooter()}
      </div>
    </div>`.trim();

  const text = `${inviter} te ha invitado a Isaak (${company}) como ${roleLabel}.\n\nAcepta aquí: ${acceptUrl}\n\nEl enlace caduca en 7 días.`;

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: resolveSender(),
    to: [input.inviteeEmail],
    subject: `${inviter} te ha invitado a Isaak — ${company}`,
    html,
    text,
  });
}
