import { NextResponse } from 'next/server';
import { DemoRequestStatus } from '@verifactu/db';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(Object.values(DemoRequestStatus));

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  const { id } = await params;

  const item = await prisma.demoRequest.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const data: { status?: DemoRequestStatus; notes?: string } = {};

  if (body.status !== undefined) {
    const s = String(body.status).trim();
    if (!VALID_STATUSES.has(s as DemoRequestStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    data.status = s as DemoRequestStatus;
  }

  if (body.notes !== undefined) {
    data.notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await prisma.demoRequest.update({ where: { id }, data });
  return NextResponse.json({ item: updated });
}
