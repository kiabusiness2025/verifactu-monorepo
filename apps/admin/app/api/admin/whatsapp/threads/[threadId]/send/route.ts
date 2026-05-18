import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Params = { params: Promise<{ threadId: string }> };

async function sendWaText(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${err}`);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { threadId } = await params;
  const { message } = await req.json();

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const thread = await prisma.whatsAppThread.findUnique({
    where: { id: threadId },
    select: { id: true, phoneNumber: true, mode: true },
  });

  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (thread.mode !== 'human') {
    return NextResponse.json({ error: 'Thread is not in human mode' }, { status: 409 });
  }

  await sendWaText(thread.phoneNumber, message.trim());

  const event = await prisma.whatsAppEvent.create({
    data: {
      threadId,
      tenantId: null,
      eventType: 'human_message',
      direction: 'outbound',
      body: message.trim(),
      status: 'sent',
    },
  });

  await prisma.whatsAppThread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({ event });
}
