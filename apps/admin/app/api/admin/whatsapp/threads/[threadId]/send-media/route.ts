import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Params = { params: Promise<{ threadId: string }> };

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/ogg',
  'audio/mpeg',
  'video/mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function mimeToWaType(mime: string): 'image' | 'document' | 'audio' | 'video' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

async function uploadToWhatsApp(file: Blob, mimeType: string): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', file, 'attachment');

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WA media upload failed ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function sendWaMedia(
  to: string,
  mediaId: string,
  mediaType: 'image' | 'document' | 'audio' | 'video',
  caption?: string,
  filename?: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const payload: Record<string, unknown> = { id: mediaId };
  if (caption) payload.caption = caption;
  if (filename && mediaType === 'document') payload.filename = filename;

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: payload,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WA send media failed ${res.status}: ${err}`);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { threadId } = await params;

  const thread = await prisma.whatsAppThread.findUnique({
    where: { id: threadId },
    select: { id: true, phoneNumber: true, mode: true, tenantId: true },
  });
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (thread.mode !== 'human') {
    return NextResponse.json({ error: 'Thread is not in human mode' }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const caption = (formData.get('caption') as string | null) ?? undefined;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }
  if (file.size > 16 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 16 MB)' }, { status: 413 });
  }

  const mediaType = mimeToWaType(file.type);
  const mediaId = await uploadToWhatsApp(file, file.type);
  await sendWaMedia(thread.phoneNumber, mediaId, mediaType, caption, file.name);

  const bodyLabel = `[${mediaType}: ${file.name}${caption ? ' — ' + caption : ''}]`;
  const event = await prisma.whatsAppEvent.create({
    data: {
      threadId,
      tenantId: thread.tenantId,
      eventType: `human_${mediaType}`,
      direction: 'outbound',
      body: bodyLabel,
      status: 'sent',
      payload: { mediaId, mimeType: file.type, filename: file.name, caption },
    },
  });

  await prisma.whatsAppThread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({ event });
}
