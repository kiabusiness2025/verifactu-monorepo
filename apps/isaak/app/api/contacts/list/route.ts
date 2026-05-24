import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedListContacts } from '@/app/lib/holded-api';
import { getHoldedSession } from '@/app/lib/holded-session';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/contacts/list?type=client|supplier|all&search= */
export async function GET(request: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conn = await getHoldedConnection(session.tenantId);
  if (!conn?.apiKey) {
    return NextResponse.json(
      { ok: false, error: 'No hay conexión Holded activa.' },
      { status: 422 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'all';
  const search = (searchParams.get('search') ?? '').toLowerCase().trim();

  const holdedType = type === 'client' ? 'client' : type === 'supplier' ? 'supplier' : undefined;
  const result = await holdedListContacts(conn.apiKey, { type: holdedType, limit: 500 });

  type RawContact = Record<string, unknown>;
  let contacts = result.contacts as RawContact[];

  if (search) {
    contacts = contacts.filter((c) => {
      const name = String(c.name ?? '').toLowerCase();
      const nif = String(c.vatnumber ?? '').toLowerCase();
      const email = String(c.email ?? '').toLowerCase();
      return name.includes(search) || nif.includes(search) || email.includes(search);
    });
  }

  const mapped = contacts.map((c) => ({
    id: String(c._id ?? c.id ?? ''),
    name: String(c.name ?? ''),
    type: String(c.type ?? 'other'),
    nif: c.vatnumber ? String(c.vatnumber) : null,
    email: c.email ? String(c.email) : null,
    phone: c.phone ? String(c.phone) : null,
    balance: c.balance !== undefined ? Number(c.balance) : null,
    country: c.country ? String(c.country) : null,
  }));

  return NextResponse.json({
    ok: true,
    contacts: mapped,
    total: mapped.length,
    truncated: result.truncated,
  });
}
