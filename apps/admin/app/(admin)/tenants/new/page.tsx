import { redirect } from "next/navigation";

export default function NewTenantPage() {
  redirect("/dashboard/admin/companies/new");
}
