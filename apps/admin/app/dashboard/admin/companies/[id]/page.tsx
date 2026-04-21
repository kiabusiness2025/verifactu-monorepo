import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCompanyLegacyDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/tenants/${id}/overview`);
}
