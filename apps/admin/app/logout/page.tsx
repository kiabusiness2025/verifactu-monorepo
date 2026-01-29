import { redirect } from "next/navigation";

export default function AdminLogoutPage() {
  redirect("/api/auth/signout");
}
