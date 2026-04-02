import { sendCustomEmail } from '@/lib/email/emailService';

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'support@verifactu.business';

type HoldedLifecycleAction = 'connected' | 'disconnected';
type HoldedLifecycleChannel = 'dashboard' | 'chatgpt';

function renderActionLabel(action: HoldedLifecycleAction) {
  return action === 'connected' ? 'conexion activada' : 'conexion desconectada';
}

function renderChannelLabel(channel: HoldedLifecycleChannel) {
  return channel === 'chatgpt' ? 'ChatGPT' : 'dashboard';
}

function buildUserHtml(args: {
  userName: string;
  tenantName: string;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const actionLabel = renderActionLabel(args.action);
  const channelLabel = renderChannelLabel(args.channel);

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Holded: ${actionLabel}</h2>
      <p>Hola ${args.userName},</p>
      <p>Te confirmamos que la ${actionLabel} para la empresa <strong>${args.tenantName}</strong> se ha realizado correctamente.</p>
      <p>Canal: <strong>${channelLabel}</strong>.</p>
      <p>Si no reconoces este cambio, responde a este correo o escríbenos a <strong>support@verifactu.business</strong>.</p>
    </div>
  `;
}

function buildAdminHtml(args: {
  userName: string;
  userEmail: string;
  tenantName: string;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const actionLabel = renderActionLabel(args.action);
  const channelLabel = renderChannelLabel(args.channel);

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Holded: ${actionLabel}</h2>
      <p>Usuario: <strong>${args.userName}</strong> (${args.userEmail})</p>
      <p>Empresa: <strong>${args.tenantName}</strong></p>
      <p>Canal: <strong>${channelLabel}</strong></p>
      <p>Evento: <strong>${args.action}</strong></p>
    </div>
  `;
}

export async function sendHoldedConnectionLifecycleEmails(args: {
  userEmail: string | null;
  userName: string | null;
  tenantName: string;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const deliveries: Array<Promise<unknown>> = [];
  const safeUserName = args.userName?.trim() || 'equipo';
  const actionLabel = renderActionLabel(args.action);

  if (args.userEmail?.trim()) {
    deliveries.push(
      sendCustomEmail({
        to: args.userEmail.trim(),
        subject: `Holded: ${actionLabel}`,
        html: buildUserHtml({
          userName: safeUserName,
          tenantName: args.tenantName,
          action: args.action,
          channel: args.channel,
        }),
      })
    );
  }

  deliveries.push(
    sendCustomEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Admin: Holded ${actionLabel}`,
      html: buildAdminHtml({
        userName: safeUserName,
        userEmail: args.userEmail?.trim() || 'sin-email',
        tenantName: args.tenantName,
        action: args.action,
        channel: args.channel,
      }),
    })
  );

  return Promise.allSettled(deliveries);
}
