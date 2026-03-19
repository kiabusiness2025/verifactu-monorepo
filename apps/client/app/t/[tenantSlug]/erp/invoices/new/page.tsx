import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantFromSession, getCustomersForDropdown, getNextInvoiceNumber } from '@/src/server/erp';
import { NewInvoiceForm } from '@/src/components/erp/NewInvoiceForm';
import { SectionTitle, Card, CardContent } from '@/src/ui';

export default async function NewInvoicePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await getSessionPayload();
  if (!session?.uid) redirect('/login');

  const { tenantSlug } = await params;
  const tenant = await resolveTenantFromSession(session, tenantSlug);

  const [customers, nextNumber] = await Promise.all([
    getCustomersForDropdown(tenant.id),
    getNextInvoiceNumber(tenant.id),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <SectionTitle title="Nueva factura" />

      <Card>
        <CardContent className="p-6">
          <NewInvoiceForm
            tenantId={tenant.id}
            tenantSlug={tenantSlug}
            customers={customers}
            nextNumber={nextNumber}
            defaultIssueDate={today}
            defaultDueDate={dueDateStr}
          />
        </CardContent>
      </Card>
    </div>
  );
}
