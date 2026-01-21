import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdminSession();
  const body = await req.json();
  const { template, subject, message } = body;

  if (!template && !subject) {
    return NextResponse.json({ error: 'Template or subject required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id }
  });

  if (!user || !user.email) {
    return NextResponse.json({ error: 'User or email not found' }, { status: 404 });
  }

  try {
    const result = await resend.emails.send({
      from: 'Verifactu <no-reply@verifactu.business>',
      to: user.email,
      subject: subject || 'Message from Verifactu Support',
      html: message || '<p>This is a message from Verifactu support team.</p>'
    });

    await prisma.$transaction([
      prisma.emailEvent.create({
        data: {
          messageId: result.data?.id,
          to: user.email,
          template,
          subject,
          status: 'SENT',
          provider: 'resend',
          userId: params.id
        }
      }),
      prisma.auditLog.create({
        data: {
          adminUserId: session.userId!,
          action: 'EMAIL_SEND',
          targetUserId: params.id,
          metadata: { template, subject, to: user.email }
        }
      })
    ]);

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (error: any) {
    await prisma.emailEvent.create({
      data: {
        to: user.email,
        template,
        subject,
        status: 'FAILED',
        provider: 'resend',
        lastError: error.message,
        userId: params.id
      }
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
