import DashboardClientLayout from "./DashboardClientLayout";
import { getSessionPayload } from "@/lib/session";
import { resolveActiveTenant } from "@/src/server/tenant/resolveActiveTenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supportMode = false;
  let supportTenantName: string | null = null;

  try {
    const session = await getSessionPayload();

    if (session?.uid) {
      const resolved = await resolveActiveTenant({
        userId: session.uid,
        sessionTenantId: session.tenantId ?? null,
      });
      supportMode = resolved.supportMode;
      supportTenantName = resolved.tenant?.legalName || resolved.tenant?.name || null;
    }
  } catch (error) {
    console.error("[dashboard/layout] failed to resolve support tenant context", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <DashboardClientLayout supportMode={supportMode} supportTenantName={supportTenantName}>
      {children}
    </DashboardClientLayout>
  );
}
