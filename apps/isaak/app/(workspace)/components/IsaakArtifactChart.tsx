'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { IsaakArtifact } from '@/app/lib/isaak-artifact';

const COLORS = [
  '#2361d8',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
];

function fmtNum(v: unknown) {
  if (typeof v !== 'number') return String(v ?? '');
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function IsaakArtifactChart({ artifact }: { artifact: IsaakArtifact }) {
  const { chartType, chartData, chartKeys } = artifact;
  if (!chartData || !chartKeys || chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-slate-400">
        Sin datos para el periodo seleccionado.
      </div>
    );
  }

  const { nameKey, valueKeys } = chartKeys;

  if (chartType === 'pie') {
    const key = valueKeys[0];
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={key}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) =>
              `${String(name).slice(0, 14)} ${((percent ?? 0) * 100).toFixed(1)}%`
            }
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={fmtNum} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line' || chartType === 'area') {
    const ChartComp = chartType === 'area' ? AreaChart : LineChart;
    const DataComp = chartType === 'area' ? Area : Line;
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ChartComp data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
          <Tooltip formatter={fmtNum} />
          <Legend />
          {valueKeys.map((k, i) => (
            <DataComp
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={chartType === 'area' ? 0.15 : undefined}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </ChartComp>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
        <Tooltip formatter={fmtNum} />
        <Legend />
        {valueKeys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
