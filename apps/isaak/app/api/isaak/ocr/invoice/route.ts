import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { extractInvoiceFromImage } from '@/app/lib/isaak-ocr-invoice';

// F4b: invoice OCR endpoint.
//
// Accepts either:
//   - { imageUrl: "https://..." }     — public URL the model will fetch
//   - { imageBase64: "...", mimeType: "image/jpeg" } — inline upload
//
// Returns the structured InvoiceExtraction.
//
// Authenticated only. The caller must be a workspace user (the heavy
// model cost makes this unsafe to leave open).

const MAX_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB cap
const ACCEPTED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session?.userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const input = body as {
    imageUrl?: unknown;
    imageBase64?: unknown;
    mimeType?: unknown;
    hint?: unknown;
    detail?: unknown;
  };

  let resolvedImageUrl: string | null = null;

  if (typeof input.imageUrl === 'string' && input.imageUrl.trim()) {
    const url = input.imageUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageUrl_must_be_http_or_data_image' }, { status: 400 });
    }
    resolvedImageUrl = url;
  } else if (typeof input.imageBase64 === 'string' && input.imageBase64.trim()) {
    const base64 = input.imageBase64.trim();
    // Reject obviously oversized payloads — base64 length ≈ 4/3 of bytes.
    if (base64.length > (MAX_BASE64_BYTES * 4) / 3) {
      return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
    }
    const mime = typeof input.mimeType === 'string' ? input.mimeType.trim() : 'image/jpeg';
    if (!ACCEPTED_MIMES.has(mime)) {
      return NextResponse.json({ error: 'unsupported_mime' }, { status: 415 });
    }
    resolvedImageUrl = `data:${mime};base64,${base64}`;
  } else {
    return NextResponse.json({ error: 'missing_image_input' }, { status: 400 });
  }

  const detail =
    input.detail === 'low' || input.detail === 'high' || input.detail === 'auto'
      ? input.detail
      : 'auto';
  const hint = typeof input.hint === 'string' ? input.hint.trim().slice(0, 500) : undefined;

  const extraction = await extractInvoiceFromImage({
    imageUrl: resolvedImageUrl,
    detail,
    hint,
  });

  return NextResponse.json({ extraction });
}
