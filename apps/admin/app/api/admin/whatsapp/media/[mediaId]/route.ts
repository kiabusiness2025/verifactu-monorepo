import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// Proxy to stream WhatsApp media through admin so the browser can display it.
// Meta media URLs require an Authorization header that browsers can't add directly.

type Params = { params: Promise<{ mediaId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { mediaId } = await params;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'WA not configured' }, { status: 503 });

  // Step 1: resolve the download URL for this media_id
  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
  const { url } = (await metaRes.json()) as { url: string };

  // Step 2: stream the actual file back to the browser
  const fileRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
  }

  const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = await fileRes.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
