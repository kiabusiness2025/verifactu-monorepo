// Constantes públicas del modo Demo — sin imports de runtime server.
//
// Se separan del resto de `isaak-demo-context.ts` (que usa prisma +
// next/headers) para que componentes 'use client' como DemoShell.tsx
// puedan importarlas sin arrastrar dependencias server-only.

export const DEMO_COMPANY_NAME = 'Nova Gestión S.L.';
export const DEMO_DAILY_LIMIT = 20;
