type PanelEmptyStateProps = {
  message: string;
};

export function PanelEmptyState({ message }: PanelEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      {message}
    </div>
  );
}
