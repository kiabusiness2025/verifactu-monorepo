import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { encryptHoldedSecret, maskSecret } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { logAdvisorEvent } from '@/app/lib/isaak-advisor-audit';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.advisorClient.findUnique({ where: { id } });
  if (!existing || existing.advisorTenantId !== session.tenantId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.alias !== undefined) update.alias = String(body.alias).trim();
  if (body.companyName !== undefined) update.companyName = body.companyName?.trim() || null;
  if (body.nif !== undefined) update.nif = body.nif?.trim() || null;
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null;

  if (body.holdedApiKey !== undefined) {
    if (body.holdedApiKey?.trim()) {
      update.holdedApiKeyEnc = encryptHoldedSecret(body.holdedApiKey.trim());
      update.holdedKeyMasked = maskSecret(body.holdedApiKey.trim());
    } else {
      update.holdedApiKeyEnc = null;
      update.holdedKeyMasked = null;
    }
  }

  const client = await prisma.advisorClient.update({
    where: { id },
    data: update,
    select: {
      id: true,
      alias: true,
      companyName: true,
      nif: true,
      holdedKeyMasked: true,
      notes: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Si la única clave del PATCH es "notes", lo discriminamos como
  // edición ligera. El resto va como update genérico con la lista de
  // campos modificados.
  const fields = Object.keys(update);
  const kind = fields.length === 1 && fields[0] === 'notes' ? 'client_notes_updated' : 'client_updated';
  void logAdvisorEvent(session.tenantId, kind, {
    clientId: client.id,
    alias: client.alias,
    fields,
  });

  return NextResponse.json({ client });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.advisorClient.findUnique({ where: { id } });
  if (!existing || existing.advisorTenantId !== session.tenantId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.advisorClient.update({
    where: { id },
    data: { isActive: false },
  });

  void logAdvisorEvent(session.tenantId, 'client_deleted', {
    clientId: id,
    alias: existing.alias,
  });

  return NextResponse.json({ deleted: true });
}
