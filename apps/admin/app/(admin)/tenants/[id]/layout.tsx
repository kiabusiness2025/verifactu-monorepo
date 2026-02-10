import Link from "next/link";

const tabs = [
  { label: "Overview", href: "overview" },
  { label: "Users", href: "users" },
  { label: "Billing", href: "billing" },
  { label: "Integrations", href: "integrations" },
  { label: "Audit", href: "audit" },
];

export default async function TenantLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        <div className="text-xs text-slate-500">Tenant</div>
        <div className="text-sm font-semibold text-slate-900 break-all">{id}</div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/tenants/${id}/${tab.href}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
