import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildAdminRedirectUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Conexiones Holded | Admin',
  description: 'Las conexiones Holded se operan ahora desde admin.verifactu.business.',
};

export const dynamic = 'force-dynamic';

export default async function HoldedAdminConnectionsPage() {
  redirect(buildAdminRedirectUrl('/dashboard/admin/connections'));
}
