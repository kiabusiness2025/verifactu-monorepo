import * as React from 'react';
import Link from 'next/link';
import { cn } from '../lib/utils';

export function ActionCard({
  title,
  subtitle,
  tag,
  href,
  icon,
  className,
}: {
  title: string;
  subtitle: string;
  tag: string;
  href: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl border bg-card p-4 shadow-soft transition hover:bg-muted/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        <div className="h-9 w-9 rounded-xl border bg-background flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
          {tag.toUpperCase()}
        </span>
        <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition">
          Ir →
        </span>
      </div>
    </Link>
  );
}
