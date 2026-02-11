import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyAdminRedirect() {
  const target =
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3003"
      : "https://admin.verifactu.business");

  redirect(target);
}
