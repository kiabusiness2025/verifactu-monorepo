import { requireHoldedConnectorAdminPageAccess } from '@/lib/holdedConnectorAdmin';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function HoldedConnectorAdminLayout({ children }: { children: ReactNode }) {
  await requireHoldedConnectorAdminPageAccess({
    nextPath: '/dashboard/integrations/holded',
  });

  return children;
}
