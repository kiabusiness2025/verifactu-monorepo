import Link from 'next/link';

const adminModules = [
  {
    title: 'Tenants',
    description: 'Alta, estado y configuración fiscal mínima por empresa.',
    href: '/dashboard/admin-dashboard?tab=tenants',
    cta: 'Abrir tenants',
  },
  {
    title: 'Usuarios',
    description: 'Accesos, membresías y roles por tenant.',
    href: '/dashboard/admin-dashboard?tab=users',
    cta: 'Abrir usuarios',
  },
  {
    title: 'Estado Verifactu / emisión',
    description: 'Seguimiento de emisión, errores y reintentos de facturas.',
    href: '/dashboard/invoices',
    cta: 'Ver facturas',
  },
  {
    title: 'Integraciones API',
    description: 'Estado de conexión, último sync y errores por tenant.',
    href: '/dashboard/integrations',
    cta: 'Ver integraciones',
  },
  {
    title: 'Outbox y sincronización',
    description: 'Cola de eventos, reintentos y trazabilidad por entidad.',
    href: '/dashboard/admin-dashboard?tab=outbox',
    cta: 'Ver outbox',
  },
  {
    title: 'Auditoría / logs',
    description: 'Eventos de sistema y actividad administrativa.',
    href: '/dashboard/admin-dashboard?tab=logs',
    cta: 'Ver auditoría',
  },
];

const operationalChecks = [
  'Exportación AEAT (Excel) disponible en todos los planes.',
  'Integración vía API habilitada solo en Empresa y PRO.',
  'Presupuestos listos para sincronización bidireccional (Empresa/PRO).',
];

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Centro de control para tenants, emisión fiscal, integraciones y observabilidad.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminModules.map((module) => (
          <article key={module.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{module.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            <Link
              href={module.href}
              className="mt-4 inline-flex h-9 items-center rounded-full bg-[#0b6cfb]/10 px-4 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
            >
              {module.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Checklist operativo</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {operationalChecks.map((item) => (
            <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
