import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  hasGmailScope,
  scanGmailForInvoices,
  type GmailInvoiceCandidate,
} from '@/app/lib/gmail-scan-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScanResult = {
  ok: true;
  messages: GmailInvoiceCandidate[];
  scannedAt: string;
  hasGmailScope: boolean;
};

type ErrorResult = {
  ok: false;
  error: string;
};

export async function GET(): Promise<NextResponse<ScanResult | ErrorResult>> {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ ok: false, error: 'Sesión requerida.' }, { status: 401 });
  }

  const { tenantId, userId } = session;

  // Check that a Google token exists at all
  const tokenExists = await prisma.isaakGoogleToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { id: true },
    })
    .catch(() => null);

  if (!tokenExists) {
    return NextResponse.json({ ok: false, error: 'no_google_token' }, { status: 400 });
  }

  // Check Gmail scope
  const gmailScopeGranted = await hasGmailScope(tenantId, userId);

  if (!gmailScopeGranted) {
    return NextResponse.json({
      ok: true,
      messages: [],
      scannedAt: new Date().toISOString(),
      hasGmailScope: false,
    });
  }

  try {
    const { messages, scannedAt } = await scanGmailForInvoices(tenantId, userId);
    return NextResponse.json({
      ok: true,
      messages,
      scannedAt,
      hasGmailScope: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
