import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildAdminRedirectUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Admin | Isaak para Holded',
  description: 'El backoffice de Holded vive ahora en admin.verifactu.business.',
};

export const dynamic = 'force-dynamic';

export default async function HoldedAdminPage() {
  redirect(buildAdminRedirectUrl('/dashboard/admin'));
}
