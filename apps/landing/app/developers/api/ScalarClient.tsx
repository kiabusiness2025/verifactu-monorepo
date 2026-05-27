'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function ScalarClient() {
  return (
    <ApiReferenceReact
      configuration={{
        url: '/openapi/isaak-v1.yaml',
        theme: 'default',
        hideClientButton: false,
        showSidebar: true,
        hideDownloadButton: false,
        layout: 'modern',
        defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
        metaData: {
          title: 'Isaak Platform API — Referencia',
          description:
            'Referencia interactiva de la API REST de Isaak Platform v1 con autenticación, scopes y ejemplos ejecutables.',
        },
      }}
    />
  );
}
