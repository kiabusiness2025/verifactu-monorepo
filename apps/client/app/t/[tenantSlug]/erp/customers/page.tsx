import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/ui';
import { getSessionPayload } from '@/lib/session';
import { getCustomersPageData, resolveTenantFromSession } from '@/src/server/erp';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function CustomersPage({
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
  const { items, summary } = await getCustomersPageData(tenant.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">CLIENTES</div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Clientes de {tenant.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Relación simple de clientes activos y actividad básica para orientar la facturación.
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/settings/company`}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
        >
          Ajustes de empresa
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Clientes activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.activeCount}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Clientes actualmente visibles para el negocio.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Total registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalCount}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Base actual de clientes dentro de esta empresa.
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Lectura operativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">Más claridad comercial</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ver los clientes junto a su actividad ayuda a priorizar mejor cobro y seguimiento.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Últimos clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no hay clientes en esta empresa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Nombre</th>
                    <th className="px-3 py-3 font-medium">Contacto</th>
                    <th className="px-3 py-3 font-medium">NIF</th>
                    <th className="px-3 py-3 font-medium">Ciudad</th>
                    <th className="px-3 py-3 font-medium">Facturas</th>
                    <th className="px-3 py-3 font-medium">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.email ?? item.phone ?? 'Sin contacto'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.nif ?? 'Sin NIF'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.city ?? 'Sin ciudad'}</td>
                      <td className="px-3 py-3 text-foreground">{item._count.invoices}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
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
