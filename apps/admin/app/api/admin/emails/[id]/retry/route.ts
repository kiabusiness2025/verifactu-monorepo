import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdminSession();

  const email = await prisma.emailEvent.findUnique({
    where: { id: params.id }
  });

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  try {
    // Resend the email
    const result = await resend.emails.send({
      from: 'Verifactu <no-reply@verifactu.business>',
      to: email.to,
      subject: email.subject || 'Email retry',
      html: '<p>This is a retry of a previous email.</p>'
    });

    await prisma.$transaction([
      prisma.emailEvent.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          messageId: result.data?.id,
          lastError: null,
          updatedAt: new Date()
        }
      }),
      prisma.auditLog.create({
        data: {
          adminUserId: session.userId!,
          action: 'EMAIL_RETRY',
          targetUserId: email.userId || undefined,
          metadata: { emailId: email.id, to: email.to }
        }
      })
    ]);

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (error: any) {
    await prisma.emailEvent.update({
      where: { id: email.id },
      data: {
        status: 'FAILED',
        lastError: error.message,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
