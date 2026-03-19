import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantFromSession, getSuppliersForDropdown } from '@/src/server/erp';
import { NewExpenseForm } from '@/src/components/erp/NewExpenseForm';
import { SectionTitle, Card, CardContent } from '@/src/ui';

export default async function NewExpensePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await getSessionPayload();
  if (!session?.uid) redirect('/login');

  const { tenantSlug } = await params;
  const tenant = await resolveTenantFromSession(session, tenantSlug);

  const suppliers = await getSuppliersForDropdown(tenant.id);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <SectionTitle title="Nuevo gasto" />

      <Card>
        <CardContent className="p-6">
          <NewExpenseForm
            tenantId={tenant.id}
            tenantSlug={tenantSlug}
            suppliers={suppliers}
            defaultDate={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
