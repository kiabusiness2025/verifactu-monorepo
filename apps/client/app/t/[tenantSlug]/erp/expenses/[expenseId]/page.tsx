import { getSessionPayload } from '@/lib/session';
import { getExpenseDetail, resolveTenantFromSession } from '@/src/server/erp';
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

function getStatusLabel(status: string) {
  if (status === 'received') return 'Recibido';
  if (status === 'paid') return 'Pagado';
  return status;
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; expenseId: string }>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) redirect('/login');

  const { tenantSlug, expenseId } = await params;
  const tenant = await resolveTenantFromSession(session, tenantSlug);
  const expense = await getExpenseDetail(expenseId, tenant.id);

  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/t/${tenantSlug}/erp/expenses`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Volver a gastos
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{expense.description}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fecha: {formatDate(expense.date)}</p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {getStatusLabel(expense.status)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Datos del gasto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoría</span>
              <span>{expense.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de documento</span>
              <span>{expense.docType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referencia</span>
              <span>{expense.reference ?? 'Sin referencia'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tratamiento fiscal</span>
              <span>{expense.taxCategory}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Importes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Importe</span>
              <span className="font-semibold">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA aplicado</span>
              <span>{Math.round(expense.taxRate * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-sm">Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {expense.supplier ? (
            <>
              <p className="font-medium text-foreground">{expense.supplier.name}</p>
              {expense.supplier.nif && (
                <p className="text-muted-foreground">NIF: {expense.supplier.nif}</p>
              )}
              {expense.supplier.email && (
                <p className="text-muted-foreground">{expense.supplier.email}</p>
              )}
              {expense.supplier.phone && (
                <p className="text-muted-foreground">{expense.supplier.phone}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Sin proveedor vinculado</p>
          )}
        </CardContent>
      </Card>

      {expense.notes && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{expense.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
