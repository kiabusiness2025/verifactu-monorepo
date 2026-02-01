'use client';

import { useEffect } from 'react';
import { useIsaakUI } from '@/context/IsaakUIContext';

type Props = {
  tenantId: string | null;
  demoMode: boolean;
  moduleKey: string;
  companyName?: string | null;
};

export function IsaakContextBridge({ tenantId, demoMode, moduleKey, companyName }: Props) {
  const { setCompany, setExtraContext } = useIsaakUI();

  useEffect(() => {
    if (companyName) {
      setCompany(companyName);
    }
    setExtraContext({
      tenantId,
      demoMode,
      moduleKey,
    });
  }, [companyName, demoMode, moduleKey, setCompany, setExtraContext, tenantId]);

  return null;
}
