'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type IsaakContextType = 'landing' | 'dashboard' | 'admin' | 'unknown';
export type UserRole = 'visitor' | 'user' | 'admin';

export interface IsaakDetection {
  context: IsaakContextType;
  role: UserRole;
  language: string;
  path: string;
  section: string;
  basePath: string;
  company?: string;
}

export function useIsaakDetection(): IsaakDetection {
  const pathname = usePathname() ?? '';
  const [detection, setDetection] = useState<IsaakDetection>({
    context: 'unknown',
    role: 'visitor',
    language: 'es',
    path: pathname,
    section: 'general',
    basePath: '/dashboard',
  });

  useEffect(() => {
    // Detectar contexto basado en path
    let context: IsaakContextType = 'unknown';
    let role: UserRole = 'visitor';

    if (pathname.includes('/dashboard/admin')) {
      context = 'admin';
      role = 'admin';
    } else if (pathname.includes('/dashboard') || pathname.includes('/demo')) {
      context = 'dashboard';
      role = 'user';
    } else {
      context = 'landing';
      role = 'visitor';
    }

    // Detectar idioma
    const browserLang = navigator.language.split('-')[0];
    const language = ['es', 'en', 'pt', 'fr'].includes(browserLang) ? browserLang : 'es';

    // Detectar empresa (si está disponible en localStorage o context)
    const company = localStorage.getItem('current-tenant') || undefined;

    const basePath = pathname.includes('/demo') ? '/demo' : '/dashboard';
    const section = (() => {
      if (pathname.startsWith(`${basePath}/invoices`)) return 'invoices';
      if (pathname.startsWith(`${basePath}/documents`)) return 'documents';
      if (pathname.startsWith(`${basePath}/clients`)) return 'clients';
      if (pathname.startsWith(`${basePath}/banks`)) return 'banks';
      if (pathname.startsWith(`${basePath}/calendar`)) return 'calendar';
      if (pathname.startsWith(`${basePath}/settings`)) return 'settings';
      if (pathname.startsWith(`${basePath}/isaak`)) return 'isaak';
      return 'dashboard';
    })();

    setDetection({ context, role, language, path: pathname, section, basePath, company });
  }, [pathname]);

  return detection;
}
