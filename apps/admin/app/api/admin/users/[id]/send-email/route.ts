import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@verifactu/db';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email via Gmail API using service account with domain-wide delegation
 * Service Account: api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com
 * Required scope: https://www.googleapis.com/auth/gmail.send
 * Domain-wide delegation: Impersonates support@verifactu.business
 */
async function sendViaGmail(to: string, subject: string, message: string) {
  // Security: Hardcode fromEmail to prevent spoofing
  const FROM_EMAIL = 'support@verifactu.business';

  // Initialize Gmail API with service account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    clientOptions: {
      subject: FROM_EMAIL, // Domain-wide delegation: impersonate support@
    },
  });

  const gmail = google.gmail({ version: 'v1', auth });

  // Create email message in RFC 2822 format
  const emailLines = [
    `From: Verifactu Support <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    message,
  ];

  const email = emailLines.join('\r\n');

  // Encode to base64url (RFC 4648 § 5)
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email via Gmail API
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
    fromEmail: FROM_EMAIL,
  };
}

/**
 * Send email via Resend API
 */
async function sendViaResend(to: string, subject: string, message: string) {
  const FROM_EMAIL = 'no-reply@verifactu.business';

  const result = await resend.emails.send({
    from: `Verifactu <${FROM_EMAIL}>`,
    to,
    subject,
    html: message,
  });

  return {
    messageId: result.data?.id,
    fromEmail: FROM_EMAIL,
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // RBAC: Require admin session
  const session = await requireAdminSession();

  const body = await req.json();
  const { template, subject, message, provider = 'RESEND' } = body;

  // Security: Validate provider
  if (provider !== 'RESEND' && provider !== 'GMAIL') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  if (!template && !subject) {
    return NextResponse.json({ error: 'Template or subject required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });

  if (!user || !user.email) {
    return NextResponse.json({ error: 'User or email not found' }, { status: 404 });
  }

  try {
    let emailResult;
    const emailSubject = subject || 'Message from Verifactu Support';
    const emailMessage = message || '<p>This is a message from Verifactu support team.</p>';

    // Send email via selected provider
    if (provider === 'GMAIL') {
      emailResult = await sendViaGmail(user.email, emailSubject, emailMessage);
    } else {
      emailResult = await sendViaResend(user.email, emailSubject, emailMessage);
    }

    // Store EmailEvent and AuditLog in transaction
    await prisma.$transaction([
      prisma.emailEvent.create({
        data: {
          messageId: emailResult.messageId,
          threadId: 'threadId' in emailResult ? emailResult.threadId : null, // Only populated for Gmail
          to: user.email,
          fromEmail: emailResult.fromEmail, // Hardcoded per provider
          template,
          subject: emailSubject,
          status: 'SENT',
          provider,
          userId: params.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: session.userId!,
          action: 'EMAIL_SEND',
          targetUserId: params.id,
          metadata: {
            provider,
            template,
            subject: emailSubject,
            to: user.email,
            fromEmail: emailResult.fromEmail,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      threadId: 'threadId' in emailResult ? emailResult.threadId : null,
      provider,
      fromEmail: emailResult.fromEmail,
    });
  } catch (error: any) {
    // Log failed email attempt
    const fromEmail =
      provider === 'GMAIL' ? 'support@verifactu.business' : 'no-reply@verifactu.business';

    await prisma.emailEvent.create({
      data: {
        to: user.email,
        fromEmail,
        template,
        subject,
        status: 'FAILED',
        provider,
        lastError: error.message,
        userId: params.id,
      },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
