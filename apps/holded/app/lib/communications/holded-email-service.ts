import { Resend } from 'resend';
import {
  buildHoldedAuthFailuresAdminEmail,
  buildHoldedAuthFailuresUserEmail,
  buildHoldedCompanyEmailVerificationEmail,
  buildHoldedConnectedAdminEmail,
  buildHoldedConnectedEmail,
  buildHoldedContactConfirmationEmail,
  buildHoldedDisconnectedAdminEmail,
  buildHoldedDisconnectedEmail,
  buildHoldedFirstActivityAdminEmail,
  buildHoldedInternalContactEmail,
  buildHoldedInternalDemoRequestEmail,
  buildHoldedInternalLeadEmail,
  buildHoldedInvoiceDraftCreatedAdminEmail,
  buildHoldedOnboardingGuideEmail,
  buildHoldedProfileCompletionEmail,
  buildHoldedWeeklyAdminSummaryEmail,
  buildHoldedWelcomeClaudeEmail,
  buildHoldedWelcomeChatgptEmail,
  buildHoldedWelcomeEmail,
} from './holded-email-templates';

type LeadPayload = {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  cif?: string;
  sector?: string;
  role?: string;
  message?: string;
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
  channel?: 'dashboard' | 'chatgpt' | 'claude';
  returnUrl?: string | null;
  isFirstConnection?: boolean;
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

function resolveLeadSender(channel?: string) {
  const addr = 'no-reply@holded.verifactu.business';
  if (channel === 'chatgpt') return `ChatGPT x Holded <${addr}>`;
  if (channel === 'claude') return `Claude x Holded <${addr}>`;

  const holdedFallback = `Holded <${addr}>`;
  const configured =
    cleanEnv(process.env.RESEND_FROM_HOLDED) || cleanEnv(process.env.RESEND_FROM) || holdedFallback;

  if (!configured.toLowerCase().includes('@holded.verifactu.business')) {
    return holdedFallback;
  }

  return configured;
}

function createResendTransport(channel?: string) {
  return {
    resend: new Resend(readRequiredEnv('RESEND_API_KEY')),
    from: resolveLeadSender(channel),
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
  const { resend, from, replyTo } = createResendTransport(input.channel);
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
  const adminSiteUrl =
    cleanEnv(process.env.ADMIN_SITE_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_ADMIN_SITE_URL) ||
    'https://admin.verifactu.business';
  const chatUrl = `${appSiteUrl}/dashboard?source=holded_connected_email`;
  const settingsUrl = `${appSiteUrl}/dashboard/integrations?source=holded_connected_email`;
  const adminPanelUrl = `${adminSiteUrl}/panel`;
  const profileCompletionUrl =
    cleanEnv(input.profileCompletionUrl || undefined) ||
    `${holdedSiteUrl}/onboarding/profile?source=holded_connected_email&channel=${input.channel ?? 'chatgpt'}`;
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
    adminPanelUrl,
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

  if (input.isFirstConnection && (input.channel === 'chatgpt' || input.channel === 'claude')) {
    const welcomeTemplate =
      input.channel === 'claude'
        ? buildHoldedWelcomeClaudeEmail({
            name: input.name,
            returnUrl: input.returnUrl,
            profileCompletionUrl,
          })
        : buildHoldedWelcomeChatgptEmail({
            name: input.name,
            returnUrl: input.returnUrl,
            profileCompletionUrl,
          });
    const profileTemplate = buildHoldedProfileCompletionEmail({
      name: input.name,
      profileCompletionUrl,
    });
    Promise.all([
      resend.emails.send({
        from,
        to: [input.userEmail],
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text,
        replyTo,
      }),
      resend.emails.send({
        from,
        to: [input.userEmail],
        subject: profileTemplate.subject,
        html: profileTemplate.html,
        text: profileTemplate.text,
        replyTo,
      }),
    ]).catch(() => {});
  }

  return {
    customerEmailId: results[0]?.data?.id ?? null,
    companyEmailId: companyEmailSent ? (results[1]?.data?.id ?? null) : null,
    adminEmailId: results[companyEmailSent ? 2 : 1]?.data?.id ?? null,
  };
}

export async function sendHoldedDisconnectedCommunication(input: {
  name: string;
  userEmail: string;
  companyName: string;
  channel: 'dashboard' | 'chatgpt' | 'claude' | 'mobile';
}) {
  const { resend, from, replyTo } = createResendTransport(input.channel);

  const holdedSiteUrl =
    cleanEnv(process.env.NEXT_PUBLIC_HOLDED_SITE_URL) || 'https://holded.verifactu.business';
  const adminSiteUrl =
    cleanEnv(process.env.ADMIN_SITE_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_ADMIN_SITE_URL) ||
    'https://admin.verifactu.business';

  const reconnectUrl = `${holdedSiteUrl}/onboarding/holded?source=holded_disconnected_email&channel=${input.channel}`;
  const adminPanelUrl = `${adminSiteUrl}/panel`;

  const configuredAdminRecipients = readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS
  );
  const adminRecipients =
    configuredAdminRecipients.length > 0
      ? configuredAdminRecipients
      : ['soporte@verifactu.business'];

  const userTemplate = buildHoldedDisconnectedEmail({
    name: input.name,
    companyName: input.companyName,
    channel: input.channel,
    reconnectUrl,
  });
  const adminTemplate = buildHoldedDisconnectedAdminEmail({
    name: input.name,
    userEmail: input.userEmail,
    companyName: input.companyName,
    channel: input.channel,
    adminPanelUrl,
  });

  const [userResult, adminResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: userTemplate.subject,
      html: userTemplate.html,
      text: userTemplate.text,
      replyTo,
    }),
    resend.emails.send({
      from,
      to: adminRecipients,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      text: adminTemplate.text,
      replyTo: input.userEmail,
    }),
  ]);

  return {
    userEmailId: userResult.data?.id ?? null,
    adminEmailId: adminResult.data?.id ?? null,
  };
}

export async function sendHoldedContactNotification(input: {
  name: string;
  email: string;
  subject?: string;
  cif?: string;
  sector?: string;
  role?: string;
  message: string;
}) {
  const { resend, from, replyTo } = createResendTransport();
  const recipient = readOptionalEnv('HOLDED_CONTACT_EMAIL', 'info@verifactu.business');

  const internalTemplate = buildHoldedInternalContactEmail({ ...input });
  const confirmationTemplate = buildHoldedContactConfirmationEmail({ name: input.name });

  const [internalResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [recipient],
      subject: internalTemplate.subject,
      html: internalTemplate.html,
      text: internalTemplate.text,
      replyTo: input.email,
    }),
    resend.emails.send({
      from,
      to: [input.email],
      subject: confirmationTemplate.subject,
      html: confirmationTemplate.html,
      text: confirmationTemplate.text,
      replyTo,
    }),
  ]);

  return {
    success: !internalResult.error,
    messageId: internalResult.data?.id ?? null,
    error: internalResult.error ?? null,
  };
}

export async function sendHoldedWeeklySummaryAdminEmail(input: {
  weekLabel: string;
  newConnections: number;
  newConnectionsByChannel: { chatgpt: number; dashboard: number; claude?: number };
  disconnections: number;
  totalActive: number;
}) {
  const { resend, from } = createResendTransport();
  const configuredAdminRecipients = readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS
  );
  const adminRecipients =
    configuredAdminRecipients.length > 0
      ? configuredAdminRecipients
      : ['soporte@verifactu.business'];

  const adminSiteUrl =
    cleanEnv(process.env.ADMIN_SITE_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_ADMIN_SITE_URL) ||
    'https://admin.verifactu.business';
  const adminPanelUrl = `${adminSiteUrl}/panel`;

  const template = buildHoldedWeeklyAdminSummaryEmail({ ...input, adminPanelUrl });

  const result = await resend.emails.send({
    from,
    to: adminRecipients,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business'),
  });

  return {
    success: !result.error,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
    recipients: adminRecipients,
  };
}

type DemoRequestNotificationPayload = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  taxId?: string;
  role?: string;
  usesHolded?: boolean;
  objective?: string;
  source?: string;
};

export async function sendHoldedDemoRequestNotification(
  input: DemoRequestNotificationPayload
): Promise<{ success: boolean; messageId: string | null; error: unknown }> {
  const { resend, from, replyTo } = createResendTransport();

  const adminEmail = readOptionalEnv('RESEND_ADMIN_EMAIL', 'soporte@verifactu.business');
  const adminEmails = readEmailList(process.env.RESEND_ADMIN_EMAILS, adminEmail);

  const template = buildHoldedInternalDemoRequestEmail(input);

  const result = await resend.emails.send({
    from,
    to: adminEmails,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: input.email || replyTo,
  });

  return {
    success: !result.error,
    messageId: result.data?.id ?? null,
    error: result.error ?? null,
  };
}

// ── F5: helpers de envio para los eventos operativos del conector ───────────
// Cada uno toma una fila de ExternalConnection + datos del evento, construye
// el template y lo envia. Estan diseñados para ser invocados desde el endpoint
// connector-event (que recibe webhooks de apps/holded-mcp).

type ConnectorEventChannel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

function readAdminEmailList() {
  return readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
    'soporte@verifactu.business'
  );
}

export async function sendHoldedFirstActivityNotification(input: {
  companyName: string;
  userEmail: string;
  channel: ConnectorEventChannel;
  toolUsed: string | null;
  detectedAt?: Date;
}) {
  const { resend, from, replyTo } = createResendTransport(input.channel);
  const adminRecipients = readAdminEmailList();
  if (adminRecipients.length === 0) {
    return { sent: false, reason: 'no_admin_recipients' as const };
  }

  const adminPanelUrl = `${readOptionalEnv('NEXT_PUBLIC_HOLDED_SITE_URL', 'https://holded.verifactu.business')}/admin`;
  const template = buildHoldedFirstActivityAdminEmail({
    companyName: input.companyName,
    userEmail: input.userEmail,
    channel: input.channel,
    toolUsed: input.toolUsed,
    detectedAt: input.detectedAt ?? new Date(),
    adminPanelUrl,
  });

  const result = await resend.emails.send({
    from,
    to: adminRecipients,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
  });
  return { sent: !result.error, messageId: result.data?.id ?? null };
}

export async function sendHoldedInvoiceDraftNotification(input: {
  companyName: string;
  userEmail: string;
  channel: ConnectorEventChannel;
  draftId: string | null;
  draftNumber: string | null;
  contactName: string | null;
  total: number | null;
  currency: string | null;
  detectedAt?: Date;
}) {
  const { resend, from, replyTo } = createResendTransport(input.channel);
  const adminRecipients = readAdminEmailList();
  if (adminRecipients.length === 0) {
    return { sent: false, reason: 'no_admin_recipients' as const };
  }

  const adminPanelUrl = `${readOptionalEnv('NEXT_PUBLIC_HOLDED_SITE_URL', 'https://holded.verifactu.business')}/admin`;
  const template = buildHoldedInvoiceDraftCreatedAdminEmail({
    companyName: input.companyName,
    userEmail: input.userEmail,
    channel: input.channel,
    draftId: input.draftId,
    draftNumber: input.draftNumber,
    contactName: input.contactName,
    total: input.total,
    currency: input.currency,
    detectedAt: input.detectedAt ?? new Date(),
    adminPanelUrl,
  });

  const result = await resend.emails.send({
    from,
    to: adminRecipients,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo,
  });
  return { sent: !result.error, messageId: result.data?.id ?? null };
}

export async function sendHoldedAuthFailuresBurst(input: {
  userEmail: string;
  userName: string;
  companyName: string;
  channel: ConnectorEventChannel;
  failureCount: number;
  windowMinutes: number;
  detectedAt?: Date;
}) {
  const { resend, from, replyTo } = createResendTransport(input.channel);
  const adminRecipients = readAdminEmailList();
  const supportEmail = readOptionalEnv('SUPPORT_NOTIFICATION_EMAIL', 'soporte@verifactu.business');
  const reconnectUrl = `${readOptionalEnv('NEXT_PUBLIC_HOLDED_SITE_URL', 'https://holded.verifactu.business')}/auth/holded-direct?source=auth_failures_burst`;
  const adminPanelUrl = `${readOptionalEnv('NEXT_PUBLIC_HOLDED_SITE_URL', 'https://holded.verifactu.business')}/admin`;
  const detectedAt = input.detectedAt ?? new Date();

  const userTemplate = buildHoldedAuthFailuresUserEmail({
    name: input.userName,
    companyName: input.companyName,
    channel: input.channel,
    failureCount: input.failureCount,
    windowMinutes: input.windowMinutes,
    reconnectUrl,
    supportEmail,
  });

  const adminTemplate = buildHoldedAuthFailuresAdminEmail({
    companyName: input.companyName,
    userEmail: input.userEmail,
    channel: input.channel,
    failureCount: input.failureCount,
    windowMinutes: input.windowMinutes,
    detectedAt,
    adminPanelUrl,
  });

  const sends: Array<Promise<unknown>> = [];
  if (input.userEmail) {
    sends.push(
      resend.emails.send({
        from,
        to: [input.userEmail],
        subject: userTemplate.subject,
        html: userTemplate.html,
        text: userTemplate.text,
        replyTo,
      })
    );
  }
  if (adminRecipients.length > 0) {
    sends.push(
      resend.emails.send({
        from,
        to: adminRecipients,
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: adminTemplate.text,
        replyTo,
      })
    );
  }

  await Promise.allSettled(sends);
  return {
    sent: true,
    recipients: { user: Boolean(input.userEmail), admin: adminRecipients.length },
  };
}
