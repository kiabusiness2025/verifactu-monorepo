'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { logoutClient } from '../../../src/auth/session';

export default function LogoutPage() {
  const router = useRouter();

  React.useEffect(() => {
    logoutClient().finally(() => {
      router.replace('/login');
    });
  }, [router]);

  return <div className="p-6 text-sm text-muted-foreground">Cerrando sesión…</div>;
}
