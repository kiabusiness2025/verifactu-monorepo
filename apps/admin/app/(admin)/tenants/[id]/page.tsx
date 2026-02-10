import { redirect } from "next/navigation";

export default async function TenantIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tenants/${id}/overview`);
}
