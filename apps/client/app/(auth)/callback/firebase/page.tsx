'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
    consumeRedirectSession,
    type WorkspaceApiResponse,
} from '../../../../src/auth/session';
import { getDefaultClientTenantSlug } from '../../../../src/tenant/useCurrentTenant';

export default function FirebaseCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = React.useState('Conectando tu cuenta…');

  React.useEffect(() => {
    consumeRedirectSession()
      .then((workspace: WorkspaceApiResponse | null) => {
        const nextTenantSlug =
          workspace?.tenants?.find((tenant) => tenant.id === workspace.activeTenantId)?.slug ??
          getDefaultClientTenantSlug();
        router.replace(`/t/${nextTenantSlug}/dashboard`);
      })
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : 'No se pudo recuperar la sesión.');
      });
  }, [router]);

  return <div className="p-6 text-sm text-muted-foreground">{message}</div>;
}
