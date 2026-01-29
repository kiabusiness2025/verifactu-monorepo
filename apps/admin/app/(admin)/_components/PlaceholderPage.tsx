import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
  legacyHref?: string;
  actions?: { label: string; href: string }[];
};

export default function PlaceholderPage({
  title,
  description,
  legacyHref,
  actions = [],
}: PlaceholderPageProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {legacyHref && (
          <Link
            href={legacyHref}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Abrir vista anterior
          </Link>
        )}
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
