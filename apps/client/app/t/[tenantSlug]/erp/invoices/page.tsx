import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/ui';
import { getSessionPayload } from '@/lib/session';
import { getInvoicesPageData, resolveTenantFromSession } from '@/src/server/erp';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === 'draft') return 'Borrador';
  if (status === 'issued') return 'Emitida';
  if (status === 'paid') return 'Cobrada';
  return status;
}

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    redirect('/login');
  }

  const { tenantSlug } = await params;
  const tenant = await resolveTenantFromSession(session, tenantSlug);
  const { items, summary } = await getInvoicesPageData(tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">FACTURAS</div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Facturas de {tenant.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Visión rápida de facturación, borradores y seguimiento de cobro.
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/erp/invoices/new`}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
        >
          Nueva factura
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Facturación del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(summary.totalMonth)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.countMonth} factura{summary.countMonth === 1 ? '' : 's'} con impacto este mes.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Pendientes de cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.pendingCount}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Facturas emitidas que conviene revisar hoy.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.draftCount}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Documentos preparados pero todavía no emitidos.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Últimas facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no hay facturas en esta empresa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Número</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Importe</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">VeriFactu</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{item.number}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.customerName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(item.issueDate)}</td>
                      <td className="px-3 py-3 text-foreground">{formatCurrency(item.amountGross)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{getStatusLabel(item.status)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.verifactuStatus ?? 'Pendiente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
