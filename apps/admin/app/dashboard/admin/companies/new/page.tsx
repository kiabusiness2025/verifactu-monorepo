import { redirect } from "next/navigation";

export default function NewCompanyRedirectPage() {
  redirect("/dashboard/admin/companies?create=1");
}
