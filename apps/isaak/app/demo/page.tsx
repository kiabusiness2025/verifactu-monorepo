import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { checkDemoQuota, DEMO_COMPANY_NAME } from '@/app/lib/isaak-demo-context';
import DemoShell from './DemoShell';

export const metadata: Metadata = {
  title: `Demo — Isaak con ${DEMO_COMPANY_NAME}`,
  description:
    'Prueba Isaak con datos de una empresa real de demostración. Consultas financieras, informes y análisis sin conectar tu propio Holded.',
};

export default async function DemoPage() {
  const session = await getHoldedSession().catch(() => null);

  if (!session?.tenantId || !session.userId) {
    redirect('/auth?redirect=/demo');
  }

  if (!process.env.HOLDED_DEMO_API_KEY) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm font-semibold text-rose-700">
            La demo no está disponible en este momento. Vuelve pronto.
          </p>
        </div>
      </main>
    );
  }

  const quota = await checkDemoQuota(session.userId);

  return <DemoShell userName={session.name || null} demoUsed={quota.used} />;
}
