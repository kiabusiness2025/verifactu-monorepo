import { getSessionPayload } from '@/lib/session';
import { getInvoiceDetail, resolveTenantFromSession } from '@/src/server/erp';
import IssueInvoiceButton from '@/src/components/erp/IssueInvoiceButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/ui';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    issued: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    draft: 'Borrador',
    issued: 'Emitida',
    paid: 'Cobrada',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function VerifactuBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return <span className="text-sm text-muted-foreground">Pendiente de registro</span>;
  }
  if (status === 'validated') {
    return <span className="inline-flex items-center gap-1 text-sm text-green-700">✓ Registrada en AEAT</span>;
  }
  return <span className="text-sm text-red-600">{status}</span>;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; invoiceId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) redirect('/login');

  const { tenantSlug, invoiceId } = await params;
  const tenant = await resolveTenantFromSession(session, tenantSlug);
  const invoice = await getInvoiceDetail(invoiceId, tenant.id);

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/t/${tenantSlug}/erp/invoices`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Volver a facturas
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{invoice.number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Emitida el {formatDate(invoice.issueDate)}
          </p>
        </div>

        {/* Acción principal según estado */}
        {invoice.status === 'draft' && (
          <div className="shrink-0">
            <IssueInvoiceButton invoiceId={invoice.id} />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Datos del cliente */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{invoice.customerName}</p>
            {invoice.customerNif && (
              <p className="text-muted-foreground">NIF: {invoice.customerNif}</p>
            )}
            {invoice.customer?.email && (
              <p className="text-muted-foreground">{invoice.customer.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Importes */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Importes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base imponible</span>
              <span>{formatCurrency(invoice.amountNet)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatCurrency(invoice.amountTax)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.amountGross)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VeriFactu */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-sm">Registro fiscal VeriFactu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <VerifactuBadge status={invoice.verifactuStatus} />
          {invoice.verifactuQr && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Código QR AEAT</p>
              <p className="break-all rounded bg-muted px-3 py-2 font-mono text-xs">
                {invoice.verifactuQr}
              </p>
            </div>
          )}
          {invoice.verifactuHash && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Hash de encadenamiento</p>
              <p className="break-all rounded bg-muted px-3 py-2 font-mono text-xs">
                {invoice.verifactuHash}
              </p>
            </div>
          )}
          {invoice.verifactuLastError && (
            <p className="text-sm text-red-600">
              Error: {invoice.verifactuLastError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {invoice.notes && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
