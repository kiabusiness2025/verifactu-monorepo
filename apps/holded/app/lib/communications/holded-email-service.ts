import { Resend } from 'resend';
import {
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
  email: string;
  companyName: string;
  supportedModules: string[];
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

function resolveLeadSender() {
  const holdedFallback = 'Holded for Isaak <no-reply@holded.verifactu.business>';
  const configured =
    cleanEnv(process.env.RESEND_FROM_HOLDED) || cleanEnv(process.env.RESEND_FROM) || holdedFallback;

  if (!configured.toLowerCase().includes('@holded.verifactu.business')) {
    return holdedFallback;
  }

  return configured;
}

export async function sendHoldedLeadCommunication(input: LeadPayload) {
  const resend = new Resend(readRequiredEnv('RESEND_API_KEY'));
  const from = resolveLeadSender();
  const internalRecipient = readOptionalEnv('HOLDED_LEAD_EMAIL', 'soporte@verifactu.business');
  const replyTo = readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');

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
  const resend = new Resend(readRequiredEnv('RESEND_API_KEY'));
  const from = resolveLeadSender();
  const replyTo = readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');
  const adminRecipients = readOptionalEnv(
    'HOLDED_ADMIN_NOTIFICATION_EMAILS',
    readOptionalEnv('HOLDED_ADMIN_EMAILS', 'soporte@verifactu.business')
  )
    .split(/[,\n;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const chatUrl = 'https://isaak.verifactu.business/chat?source=holded_connected_email';
  const settingsUrl = 'https://isaak.verifactu.business/settings?section=connections';
  const customer = buildHoldedConnectedEmail({
    name: input.name,
    email: input.email,
    companyName: input.companyName,
    chatUrl,
    settingsUrl,
    supportedModules: input.supportedModules,
  });
  const admin = buildHoldedConnectedAdminEmail({
    name: input.name,
    email: input.email,
    companyName: input.companyName,
    chatUrl,
    settingsUrl,
    supportedModules: input.supportedModules,
  });

  const tasks = [
    resend.emails.send({
      from,
      to: [input.email],
      subject: customer.subject,
      html: customer.html,
      text: customer.text,
      replyTo,
    }),
  ];

  if (adminRecipients.length > 0) {
    tasks.push(
      resend.emails.send({
        from,
        to: adminRecipients,
        subject: admin.subject,
        html: admin.html,
        text: admin.text,
        replyTo: input.email,
      })
    );
  }

  const results = await Promise.all(tasks);
  return {
    customerEmailId: results[0]?.data?.id ?? null,
    adminEmailId: results[1]?.data?.id ?? null,
  };
}
