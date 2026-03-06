import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import DashboardClientLayout from '@/app/dashboard/DashboardClientLayout';

export const dynamic = 'force-dynamic';

export default async function GroupDashboardLayout({
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
    console.error('[group-dashboard/layout] failed to resolve tenant context', {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <DashboardClientLayout supportMode={supportMode} supportTenantName={supportTenantName}>
      {children}
    </DashboardClientLayout>
  );
}
