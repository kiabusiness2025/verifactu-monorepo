'use client';

import Link from 'next/link';

const cards = [
  {
    title: 'Clientes',
    description: 'Gestión comercial para emisión de facturas de venta.',
    href: '/dashboard/customers',
    cta: 'Abrir clientes',
  },
  {
    title: 'Proveedores',
    description: 'Base de proveedores para gastos y compras deducibles.',
    href: '/dashboard/suppliers',
    cta: 'Abrir proveedores',
  },
];

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Clientes / Proveedores</h1>
        <p className="mt-1 text-sm text-slate-600">Gestiona los contactos canónicos para ventas y gastos.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((item) => (
          <article key={item.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <Link
              href={item.href}
              className="mt-4 inline-flex h-9 items-center rounded-full bg-[#0b6cfb]/10 px-4 text-xs font-semibold text-[#0b6cfb] hover:bg-[#0b6cfb]/20"
            >
              {item.cta}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
