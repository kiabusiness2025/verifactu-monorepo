import { requireAdminSession } from '@/lib/auth';
import { prisma } from '@verifactu/db';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email via Gmail API using service account with domain-wide delegation
 */
async function sendViaGmail(to: string, subject: string, message: string) {
  // Initialize Gmail API with service account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    clientOptions: {
      subject: 'support@verifactu.business', // Impersonate support email
    },
  });

  const gmail = google.gmail({ version: 'v1', auth });

  // Create email message in RFC 2822 format
  const emailLines = [
    `From: Verifactu Support <support@verifactu.business>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    message,
  ];

  const email = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
}

/**
 * Send email via Resend API
 */
async function sendViaResend(to: string, subject: string, message: string) {
  const result = await resend.emails.send({
    from: 'Verifactu <no-reply@verifactu.business>',
    to,
    subject,
    html: message,
  });

  return {
    messageId: result.data?.id,
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  const body = await req.json();
  const { template, subject, message, provider = 'RESEND' } = body;

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

    if (provider === 'GMAIL') {
      emailResult = await sendViaGmail(user.email, emailSubject, emailMessage);
    } else {
      emailResult = await sendViaResend(user.email, emailSubject, emailMessage);
    }

    await prisma.$transaction([
      prisma.emailEvent.create({
        data: {
          messageId: emailResult.messageId,
          threadId: emailResult.threadId,
          to: user.email,
          fromEmail:
            provider === 'GMAIL' ? 'support@verifactu.business' : 'no-reply@verifactu.business',
          template,
          subject: emailSubject,
          status: 'SENT',
          provider,
          userId: params.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          adminUserId: session.userId!,
          action: 'EMAIL_SEND',
          targetUserId: params.id,
          metadata: { provider, template, subject: emailSubject, to: user.email },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      threadId: emailResult.threadId,
      provider,
    });
  } catch (error: any) {
    await prisma.emailEvent.create({
      data: {
        to: user.email,
        fromEmail:
          provider === 'GMAIL' ? 'support@verifactu.business' : 'no-reply@verifactu.business',
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
