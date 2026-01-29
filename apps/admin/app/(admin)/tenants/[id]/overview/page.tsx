import { redirect } from "next/navigation";

export default function TenantOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/dashboard/admin/companies/${params.id}`);
}
