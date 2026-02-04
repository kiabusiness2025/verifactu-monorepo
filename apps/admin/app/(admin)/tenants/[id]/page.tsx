import { redirect } from "next/navigation";

export default function TenantIndexPage({ params }: { params: { id: string } }) {
  redirect(`/tenants/${params.id}/overview`);
}
