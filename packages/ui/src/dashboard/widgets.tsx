import * as React from "react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, icon, className }: MetricCardProps) {
  return (
    <div className={`rounded-lg bg-white dark:bg-neutral-900 shadow p-4 flex items-center gap-4 ${className ?? ''}`.trim()}>
      {icon && <div className="text-2xl text-primary">{icon}</div>}
      <div>
        <div className="text-xs text-muted-foreground font-medium mb-1">{label}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

export interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ActionCard({ title, description, icon, action, className }: ActionCardProps) {
  return (
    <div className={`rounded-lg bg-white dark:bg-neutral-900 shadow p-4 flex items-center gap-4 ${className ?? ''}`.trim()}>
      {icon && <div className="text-2xl text-primary">{icon}</div>}
      <div className="flex-1">
        <div className="text-base font-semibold mb-1">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
