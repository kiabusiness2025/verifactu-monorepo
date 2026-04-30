'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type MonthlyPoint = {
  month: string;
  sales: number;
  expenses: number | null;
};

function formatEur(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className="font-semibold">
            {entry.value.toLocaleString('es-ES', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}{' '}
            €
          </span>
        </p>
      ))}
    </div>
  );
}

export default function ResumenChart({ data }: { data: MonthlyPoint[] }) {
  const hasExpenses = data.some((d) => d.expenses !== null && d.expenses > 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={20} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={formatEur}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="sales" name="Ventas" fill="#2361d8" radius={[4, 4, 0, 0]} />
        {hasExpenses && (
          <Bar dataKey="expenses" name="Gastos" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
