import type { Metadata } from 'next';
import ScalarClient from './ScalarClient';

export const metadata: Metadata = {
  title: 'API Reference | Isaak Platform — Verifactu Business',
  description:
    'Referencia interactiva de la API REST de Isaak Platform v1. OpenAPI 3.1, autenticación Bearer, scopes y ejemplos curl ejecutables.',
  openGraph: {
    title: 'Isaak Platform API — Referencia interactiva',
    description:
      'Documentación completa de los endpoints REST de Isaak. Prueba peticiones directamente desde el navegador.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://verifactu.business/developers/api',
    siteName: 'Verifactu Business',
  },
  alternates: {
    canonical: '/developers/api',
  },
};

export default function ApiReferencePage() {
  return (
    <main className="min-h-screen bg-white">
      <ScalarClient />
    </main>
  );
}
