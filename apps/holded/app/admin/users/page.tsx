import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildAdminRedirectUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Usuarios | Admin Holded',
  description: 'La gestión de usuarios vive ahora en admin.verifactu.business.',
};

export const dynamic = 'force-dynamic';

export default async function HoldedAdminUsersPage() {
  redirect(buildAdminRedirectUrl('/dashboard/admin/users'));
}
