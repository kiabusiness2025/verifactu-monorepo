import type { ReactNode } from 'react';

type PanelSectionCardProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PanelSectionCard({
  title,
  description,
  aside,
  children,
  className = '',
}: PanelSectionCardProps) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
