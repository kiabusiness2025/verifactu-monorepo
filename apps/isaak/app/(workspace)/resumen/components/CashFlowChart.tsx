'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type CashFlowPoint = {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
};

function formatEur(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: CashFlowPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[12px] shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      <p className="text-emerald-600">
        Entradas:{' '}
        <span className="font-semibold">
          {payload[0]?.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
        </span>
      </p>
      <p className="text-rose-500">
        Salidas:{' '}
        <span className="font-semibold">
          {Math.abs(payload[1]?.value ?? 0).toLocaleString('es-ES', {
            maximumFractionDigits: 0,
          })}{' '}
          €
        </span>
      </p>
      {point && (
        <p
          className={`mt-1 border-t border-slate-100 pt-1 font-semibold ${point.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
        >
          Neto: {point.net.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
        </p>
      )}
    </div>
  );
}

export default function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  // Outflow is plotted as negative so bars go down
  const chartData = data.map((d) => ({
    ...d,
    outflowNeg: -d.outflow,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barSize={14} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickFormatter={formatEur}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="inflow" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} stackId="cf" />
        <Bar
          dataKey="outflowNeg"
          name="Salidas"
          fill="#f43f5e"
          radius={[0, 0, 3, 3]}
          stackId="cf"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
