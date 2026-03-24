import { Resend } from 'resend';
import {
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

export async function sendHoldedLeadCommunication(input: LeadPayload) {
  const resend = new Resend(readRequiredEnv('RESEND_API_KEY'));
  const from = readOptionalEnv(
    'RESEND_FROM',
    'Holded for Isaak <no-reply@holded.verifactu.business>'
  );
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
    }),
    resend.emails.send({
      from,
      to: [input.email],
      subject: guide.subject,
      html: guide.html,
      text: guide.text,
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
