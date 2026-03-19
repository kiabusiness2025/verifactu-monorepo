import { redirect } from 'next/navigation';

export default async function BankingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/t/${tenantSlug}/banking/accounts`);
}
