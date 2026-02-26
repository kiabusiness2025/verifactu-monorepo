'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

function moduleFromPath(pathname: string) {
  if (pathname.includes('/erp/invoices') || pathname.includes('/invoices')) {
    return { module: 'Facturacion', key: 'invoices' };
  }
  if (
    pathname.includes('/erp/customers') ||
    pathname.includes('/customers') ||
    pathname.includes('/clients')
  ) {
    return { module: 'Clientes', key: 'customers' };
  }
  if (pathname.includes('/banking') || pathname.includes('/banks')) {
    return { module: 'Bancos', key: 'banking' };
  }
  if (pathname.includes('/documents')) return { module: 'Documentos', key: 'documents' };
  if (pathname.includes('/calendar')) return { module: 'Calendario', key: 'calendar' };
  if (pathname.includes('/settings')) return { module: 'Configuracion', key: 'settings' };
  if (
    pathname.includes('/assistant') ||
    pathname.includes('/isaak') ||
    pathname.includes('/chat')
  ) {
    return { module: 'Isaak', key: 'isaak' };
  }
  if (pathname.includes('/tenants') || pathname.includes('/companies')) {
    return { module: 'Empresas', key: 'tenants' };
  }
  if (pathname.includes('/users')) {
    return { module: 'Usuarios', key: 'users' };
  }
  if (pathname.includes('/support')) {
    return { module: 'Soporte', key: 'support' };
  }
  if (pathname.includes('/operations') || pathname.includes('/audit')) {
    return { module: 'Operaciones', key: 'operations' };
  }
  if (pathname.includes('/integrations')) {
    return { module: 'Integraciones', key: 'integrations' };
  }
  return { module: 'Dashboard', key: 'dashboard' };
}

export function useIsaakContext(extra?: Record<string, unknown>) {
  const pathname = usePathname() ?? '';

  return useMemo<
    {
      pathname: string;
      module: string;
      moduleKey: string;
    } & Record<string, unknown>
  >(() => {
    const mod = moduleFromPath(pathname);
    return {
      pathname,
      module: mod.module,
      moduleKey: mod.key,
      ...extra,
    };
  }, [pathname, extra]);
}
