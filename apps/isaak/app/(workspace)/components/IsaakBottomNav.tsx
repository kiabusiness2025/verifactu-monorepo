'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, MessageSquare, Receipt, Settings, TrendingUp } from 'lucide-react';
import { ISAAK_V1_LAUNCH } from '@/app/lib/feature-flags';

// V1 LAUNCH (2026-05-28): bottom nav móvil colapsado para alinear con
// sidebar reducido. Ventas/Gastos vuelven en V2+ cuando expongamos
// contabilidad completa. Ver feature-flags.ts.
const NAV_ITEMS_FULL = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/resumen', label: 'Resumen', icon: BarChart3 },
  { href: '/ventas', label: 'Ventas', icon: TrendingUp },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

const NAV_ITEMS_V1 = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/resumen', label: 'Resumen', icon: BarChart3 },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

const NAV_ITEMS = ISAAK_V1_LAUNCH ? NAV_ITEMS_V1 : NAV_ITEMS_FULL;

export default function IsaakBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/chat') return pathname === '/chat' || pathname?.startsWith('/chat/');
    if (href === '/settings') return pathname?.startsWith('/settings') ?? false;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-[#081936] pb-safe md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon
              size={20}
              className={active ? 'text-[#4d8bff]' : 'text-slate-500'}
              strokeWidth={active ? 2.5 : 2}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
