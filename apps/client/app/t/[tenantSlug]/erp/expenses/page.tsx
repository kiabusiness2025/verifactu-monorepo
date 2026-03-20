import { getSessionPayload } from '@/lib/session';
import { getExpensesPageData, resolveTenantFromSession } from '@/src/server/erp';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    redirect('/login');
  }

  const { tenantSlug } = await params;
  const query = await searchParams;
  const tenant = await resolveTenantFromSession(session, tenantSlug);

  const selectedStatus =
    query.status === 'received' || query.status === 'paid' ? query.status : 'all';
  const selectedCategory = query.category?.trim() ? query.category.trim() : 'all';

  const { items, categories, summary } = await getExpensesPageData(tenant.id, {
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">GASTOS</div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Gastos de {tenant.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vista simple para controlar gasto mensual y revisar lo que todavía requiere atención.
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/erp/expenses/new`}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
        >
          Nuevo gasto
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Gasto del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(summary.totalMonth)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.countMonth} gasto{summary.countMonth === 1 ? '' : 's'} registrados este mes.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Pendientes de revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.reviewCount}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Gastos recibidos que aún conviene confirmar o clasificar.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Lectura operativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">Menos incertidumbre</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando los gastos están al día, el beneficio refleja la situación real.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Últimos gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 grid gap-3 rounded-xl border border-border p-3 md:grid-cols-4"
            method="get"
          >
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="all">Todos</option>
                <option value="received">Recibido</option>
                <option value="paid">Pagado</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Categoría</span>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
              >
                Aplicar filtros
              </button>
              <Link
                href={`/t/${tenantSlug}/erp/expenses`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted/40"
              >
                Limpiar
              </Link>
            </div>
          </form>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay gastos para el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Descripción</th>
                    <th className="px-3 py-3 font-medium">Categoría</th>
                    <th className="px-3 py-3 font-medium">Proveedor</th>
                    <th className="px-3 py-3 font-medium">Importe</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(item.date)}</td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        <Link
                          href={`/t/${tenantSlug}/erp/expenses/${item.id}`}
                          className="hover:underline"
                        >
                          {item.description}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.supplier?.name ?? 'Sin proveedor'}
                      </td>
                      <td className="px-3 py-3 text-foreground">{formatCurrency(item.amount)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.status}</td>
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
