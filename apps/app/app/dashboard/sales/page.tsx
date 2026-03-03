'use client';

import Link from 'next/link';

const links = [
  {
    title: 'Facturas',
    description: 'Emisión, envío, cobro y estado Verifactu en un único flujo.',
    href: '/dashboard/invoices',
    cta: 'Abrir facturas',
  },
  {
    title: 'Presupuestos',
    description: 'Crea, envía y convierte presupuestos a factura.',
    href: '/dashboard/budgets',
    cta: 'Abrir presupuestos',
  },
  {
    title: 'Clientes / Proveedores',
    description: 'Gestiona contactos fiscales y comerciales.',
    href: '/dashboard/contacts',
    cta: 'Abrir contactos',
  },
  {
    title: 'Documentos',
    description: 'Sube justificantes y prepara documentación fiscal.',
    href: '/dashboard/documents',
    cta: 'Abrir documentos',
  },
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Centro operativo de facturación: presupuestos, facturas y clientes/proveedores.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {links.map((item) => (
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
