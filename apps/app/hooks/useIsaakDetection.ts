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
  company?: string;
}

export function useIsaakDetection(): IsaakDetection {
  const pathname = usePathname() ?? '';
  const [detection, setDetection] = useState<IsaakDetection>({
    context: 'unknown',
    role: 'visitor',
    language: 'es',
    path: pathname,
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

    setDetection({ context, role, language, path: pathname, company });
  }, [pathname]);

  return detection;
}
