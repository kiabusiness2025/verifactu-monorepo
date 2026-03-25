import Link from 'next/link';
import { requireHoldedAdminSession } from '@/app/lib/holded-admin';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/connections', label: 'Conexiones Holded' },
  { href: '/admin/activity', label: 'Actividad' },
];

export default async function HoldedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireHoldedAdminSession();

  return (
    <div>
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Admin Holded</div>
            <div className="text-xs text-slate-500">Panel interno de operacion</div>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-slate-900">
                {item.label}
              </Link>
            ))}
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
