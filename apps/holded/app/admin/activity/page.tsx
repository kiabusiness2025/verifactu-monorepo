import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildAdminRedirectUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Actividad | Admin Holded',
  description: 'La actividad operativa de Holded vive ahora en admin.verifactu.business.',
};

export const dynamic = 'force-dynamic';

export default async function HoldedAdminActivityPage() {
  redirect(buildAdminRedirectUrl('/dashboard/admin/activity'));
}
