'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

function moduleFromPath(pathname: string) {
  if (pathname.startsWith('/invoices')) return { module: 'Facturacion', key: 'invoices' };
  if (pathname.startsWith('/customers')) return { module: 'Clientes', key: 'customers' };
  if (pathname.startsWith('/banking')) return { module: 'Bancos', key: 'banking' };
  if (pathname.startsWith('/documents')) return { module: 'Documentos', key: 'documents' };
  if (pathname.startsWith('/calendar')) return { module: 'Calendario', key: 'calendar' };
  if (pathname.startsWith('/settings')) return { module: 'Configuracion', key: 'settings' };
  if (pathname.startsWith('/assistant')) return { module: 'Isaak', key: 'isaak' };
  return { module: 'Dashboard', key: 'dashboard' };
}

export function useIsaakContext(extra?: Record<string, unknown>) {
  const pathname = usePathname() ?? '';

  return useMemo(() => {
    const mod = moduleFromPath(pathname);
    return {
      pathname,
      module: mod.module,
      moduleKey: mod.key,
      ...extra,
    };
  }, [pathname, extra]);
}
