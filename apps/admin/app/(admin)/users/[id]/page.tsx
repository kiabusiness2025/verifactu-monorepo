import { redirect } from 'next/navigation';

export default async function LegacyUserDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/admin/users/${id}`);
}

