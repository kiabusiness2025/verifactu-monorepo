import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { buildAdminRedirectUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Detalle de usuario | Admin Holded',
  description: 'La ficha de usuario vive ahora en admin.verifactu.business.',
};

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HoldedAdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(buildAdminRedirectUrl(`/dashboard/admin/users/${id}`));
}
