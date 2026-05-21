import React from 'react';

/**
 * Stub de `react-markdown` para Jest.
 *
 * `react-markdown` es ESM puro y arrastra un árbol grande de dependencias ESM
 * (unified, remark-*, micromark*, mdast-*, hast-*, ...) que Jest no transforma
 * por defecto. Ningún test de apps/app valida el render de markdown — solo
 * necesitamos que el árbol de componentes (`@verifactu/ui` → IsaakDock) cargue.
 */
export default function ReactMarkdown({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
