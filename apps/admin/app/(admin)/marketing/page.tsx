// V2.A.4 — Hub de Marketing.
//
// Punto de entrada que agrupa las 3 sub-secciones existentes:
//   - Campañas (ex /admin-marketing)
//   - Demos solicitadas (ex /demo-requests)
//   - WhatsApp (ex /whatsapp + /whatsapp/templates)
//
// Cada card muestra un contador agregado en vivo para que el admin
// vea de un vistazo qué requiere atención.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FileText, Megaphone, MessageSquare, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

type CardSpec = {
  href: string;
  title: string;
  description: string;
  count: number | null;
  countLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

async function loadCounts() {
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since30d = new Date(Date.now() - 30 * 86_400_000);

  const [pendingDemos, newLeads7d, campaigns30d] = await Promise.all([
    prisma.demoRequest.count({ where: { status: 'PENDING' } }).catch(() => 0),
    prisma.usageEvent
      .count({
        where: { type: 'LEAD_CREATED', createdAt: { gte: since7d } },
      })
      .catch(() => 0),
    prisma.marketingCampaign
      .count({ where: { createdAt: { gte: since30d } } })
      .catch(() => 0),
  ]);

  return { pendingDemos, newLeads7d, campaigns30d };
}

export default async function MarketingHubPage() {
  const { pendingDemos, newLeads7d, campaigns30d } = await loadCounts();

  const cards: CardSpec[] = [
    {
      href: '/marketing/campaigns',
      title: 'Campañas',
      description: 'Envío de emails masivos a segmentos del usuario y recordatorios.',
      count: campaigns30d,
      countLabel: 'enviadas (30d)',
      icon: Megaphone,
      accent: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
    },
    {
      href: '/marketing/demos',
      title: 'Demos solicitadas',
      description: 'Solicitudes desde la landing para agendar una demo del producto.',
      count: pendingDemos,
      countLabel: 'pendientes de respuesta',
      icon: FileText,
      accent: pendingDemos > 0
        ? 'bg-amber-50 text-amber-600 border-amber-200'
        : 'bg-slate-50 text-slate-500 border-slate-100',
    },
    {
      href: '/marketing/whatsapp',
      title: 'WhatsApp',
      description: 'Conversaciones, plantillas Meta y broadcasts.',
      count: null,
      countLabel: 'ver actividad',
      icon: MessageSquare,
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
  ];

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Marketing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Adquisición y comunicación: campañas, demos y WhatsApp.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Nuevos leads (7d)
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{newLeads7d}</p>
          </div>
          <p className="text-[11px] text-slate-500">
            UsageEvent.type=<code className="rounded bg-slate-100 px-1 font-mono">LEAD_CREATED</code>
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${c.accent}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-slate-900">{c.title}</h2>
              <p className="mt-1 text-xs text-slate-600">{c.description}</p>
              <div className="mt-3 flex items-baseline gap-2">
                {c.count !== null && (
                  <span className="text-2xl font-bold tabular-nums text-slate-900">{c.count}</span>
                )}
                <span className="text-xs text-slate-500">{c.countLabel}</span>
                <span className="ml-auto text-xs font-semibold text-slate-400 transition group-hover:text-slate-700">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
