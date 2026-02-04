import DashboardClientLayout from "./DashboardClientLayout";
import { getSessionPayload } from "@/lib/session";
import { resolveActiveTenant } from "@/src/server/tenant/resolveActiveTenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionPayload();
  let supportMode = false;
  let supportTenantName: string | null = null;

  if (session?.uid) {
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    supportMode = resolved.supportMode;
    supportTenantName = resolved.tenant?.legalName || resolved.tenant?.name || null;
  }

  return (
    <DashboardClientLayout supportMode={supportMode} supportTenantName={supportTenantName}>
      {children}
    </DashboardClientLayout>
  );
}
