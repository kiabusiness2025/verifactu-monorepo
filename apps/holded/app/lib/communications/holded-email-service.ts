import { Resend } from 'resend';
import {
  buildHoldedCompanyEmailVerificationEmail,
  buildHoldedConnectedAdminEmail,
  buildHoldedConnectedEmail,
  buildHoldedInternalLeadEmail,
  buildHoldedOnboardingGuideEmail,
  buildHoldedWelcomeEmail,
} from './holded-email-templates';

type LeadPayload = {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  source?: string;
};

type ConnectedPayload = {
  name: string;
  userEmail: string;
  companyEmail?: string | null;
  companyName: string;
  supportedModules: string[];
  profileCompletionUrl?: string | null;
  companyEmailVerificationUrl?: string | null;
  channel?: 'dashboard' | 'chatgpt';
  returnUrl?: string | null;
};

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function readRequiredEnv(name: string) {
  const value = cleanEnv(process.env[name]);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function readOptionalEnv(name: string, fallback: string) {
  return cleanEnv(process.env[name]) || fallback;
}

function readEmailList(...values: Array<string | undefined | null>) {
  const merged = values
    .map((value) => cleanEnv(value || undefined))
    .filter(Boolean)
    .join(',');

  return Array.from(
    new Set(
      merged
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function resolveLeadSender() {
  const holdedFallback = 'Holded <no-reply@holded.verifactu.business>';
  const configured =
    cleanEnv(process.env.RESEND_FROM_HOLDED) || cleanEnv(process.env.RESEND_FROM) || holdedFallback;

  if (!configured.toLowerCase().includes('@holded.verifactu.business')) {
    return holdedFallback;
  }

  return configured;
}

function createResendTransport() {
  return {
    resend: new Resend(readRequiredEnv('RESEND_API_KEY')),
    from: resolveLeadSender(),
    replyTo: readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business'),
  };
}

export async function sendHoldedNotificationEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const transport = createResendTransport();

  const result = await transport.resend.emails.send({
    from: transport.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || transport.replyTo,
  });

  return {
    success: !result.error,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
  };
}

export async function sendHoldedLeadCommunication(input: LeadPayload) {
  const { resend, from, replyTo } = createResendTransport();
  const internalRecipient = readOptionalEnv('HOLDED_LEAD_EMAIL', 'soporte@verifactu.business');

  const welcome = buildHoldedWelcomeEmail(input);
  const guide = buildHoldedOnboardingGuideEmail(input);
  const internal = buildHoldedInternalLeadEmail(input);

  const results = await Promise.all([
    resend.emails.send({
      from,
      to: [input.email],
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
      replyTo,
    }),
    resend.emails.send({
      from,
      to: [input.email],
      subject: guide.subject,
      html: guide.html,
      text: guide.text,
      replyTo,
    }),
    resend.emails.send({
      from,
      to: [internalRecipient],
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
      replyTo: input.email,
    }),
  ]);

  return {
    customerWelcomeId: results[0].data?.id ?? null,
    customerGuideId: results[1].data?.id ?? null,
    internalLeadId: results[2].data?.id ?? null,
  };
}

export async function sendHoldedConnectedCommunication(input: ConnectedPayload) {
  const { resend, from, replyTo } = createResendTransport();
  const configuredAdminRecipients = readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS
  );
  const adminRecipients =
    configuredAdminRecipients.length > 0
      ? configuredAdminRecipients
      : ['soporte@verifactu.business'];

  const appSiteUrl =
    cleanEnv(process.env.NEXT_PUBLIC_APP_SITE_URL) || 'https://app.verifactu.business';
  const holdedSiteUrl =
    cleanEnv(process.env.NEXT_PUBLIC_HOLDED_SITE_URL) || 'https://holded.verifactu.business';
  const chatUrl = `${appSiteUrl}/dashboard?source=holded_connected_email`;
  const settingsUrl = `${appSiteUrl}/dashboard/integrations?source=holded_connected_email`;
  const profileCompletionUrl =
    cleanEnv(input.profileCompletionUrl || undefined) ||
    `${holdedSiteUrl}/onboarding/profile?source=holded_connected_email`;
  const customer = buildHoldedConnectedEmail({
    name: input.name,
    email: input.userEmail,
    companyName: input.companyName,
    chatUrl,
    settingsUrl,
    profileCompletionUrl,
    supportedModules: input.supportedModules,
    channel: input.channel,
    returnUrl: input.returnUrl,
  });
  const admin = buildHoldedConnectedAdminEmail({
    name: input.name,
    email: input.userEmail,
    companyName: input.companyName,
    chatUrl,
    settingsUrl,
    supportedModules: input.supportedModules,
    channel: input.channel,
    returnUrl: input.returnUrl,
  });

  const tasks = [];
  tasks.push(
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: customer.subject,
      html: customer.html,
      text: customer.text,
      replyTo,
    })
  );

  const normalizedCompanyEmail = cleanEnv(input.companyEmail || undefined);
  if (
    normalizedCompanyEmail &&
    normalizedCompanyEmail.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    const verificationTemplate =
      input.companyEmailVerificationUrl && input.companyEmailVerificationUrl.trim().length > 0
        ? buildHoldedCompanyEmailVerificationEmail({
            companyName: input.companyName,
            verificationUrl: input.companyEmailVerificationUrl,
            profileCompletionUrl,
          })
        : null;

    tasks.push(
      resend.emails.send({
        from,
        to: [normalizedCompanyEmail],
        subject: verificationTemplate?.subject || customer.subject,
        html: verificationTemplate?.html || customer.html,
        text: verificationTemplate?.text || customer.text,
        replyTo,
      })
    );
  }

  if (adminRecipients.length > 0) {
    tasks.push(
      resend.emails.send({
        from,
        to: adminRecipients,
        subject: admin.subject,
        html: admin.html,
        text: admin.text,
        replyTo: input.userEmail,
      })
    );
  }

  const results = await Promise.all(tasks);

  const companyEmailSent =
    normalizedCompanyEmail &&
    normalizedCompanyEmail.toLowerCase() !== input.userEmail.toLowerCase();
  return {
    customerEmailId: results[0]?.data?.id ?? null,
    companyEmailId: companyEmailSent ? (results[1]?.data?.id ?? null) : null,
    adminEmailId: results[companyEmailSent ? 2 : 1]?.data?.id ?? null,
  };
}
