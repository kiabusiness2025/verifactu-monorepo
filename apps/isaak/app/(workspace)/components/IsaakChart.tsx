'use client';

// V1.2 — Renderizador de gráficos inline para las respuestas del chat.
//
// El asistente puede incluir un fence ```isaak-chart``` con JSON. El
// renderer lo parsea y dibuja el chart con recharts. Si el JSON es
// inválido o falta algún campo, mostramos el bloque como código plano
// para que el usuario al menos vea el dato bruto.
//
// Schema esperado:
// {
//   "type": "bar" | "line" | "area" | "pie",
//   "title"?: string,
//   "data": [ { ...record } ],
//   "xKey": string,            // clave del eje X (bar/line/area)
//   "yKeys": string[],         // claves de series (1 o más)
//   "nameKey"?: string,        // pie: clave del label
//   "valueKey"?: string,       // pie: clave del valor
//   "unit"?: string,           // sufijo en tooltip y eje Y (ej. "€", "%")
//   "stacked"?: boolean
// }

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartType = 'bar' | 'line' | 'area' | 'pie';

type ChartSpec = {
  type: ChartType;
  title?: string;
  data: Array<Record<string, unknown>>;
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  unit?: string;
  stacked?: boolean;
};

// Paleta inspirada en el brand pero suficientemente diferenciada.
const COLORS = ['#2361d8', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#0891b2', '#ec4899', '#84cc16'];

function formatNumber(n: unknown, unit?: string): string {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  const formatted = new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
  }).format(num);
  return unit ? `${formatted} ${unit}` : formatted;
}

function parseSpec(raw: string): ChartSpec | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'JSON inválido' };
  }
  if (!parsed || typeof parsed !== 'object') return { error: 'No es un objeto' };
  const s = parsed as Record<string, unknown>;
  const type = s.type;
  if (type !== 'bar' && type !== 'line' && type !== 'area' && type !== 'pie') {
    return { error: `type debe ser bar | line | area | pie (recibido: ${String(type)})` };
  }
  if (!Array.isArray(s.data) || s.data.length === 0) {
    return { error: 'data debe ser un array no vacío' };
  }
  return {
    type,
    title: typeof s.title === 'string' ? s.title : undefined,
    data: s.data as Array<Record<string, unknown>>,
    xKey: typeof s.xKey === 'string' ? s.xKey : undefined,
    yKeys: Array.isArray(s.yKeys) ? (s.yKeys as string[]).filter((y) => typeof y === 'string') : undefined,
    nameKey: typeof s.nameKey === 'string' ? s.nameKey : undefined,
    valueKey: typeof s.valueKey === 'string' ? s.valueKey : undefined,
    unit: typeof s.unit === 'string' ? s.unit : undefined,
    stacked: s.stacked === true,
  };
}

export default function IsaakChart({ raw }: { raw: string }) {
  const result = parseSpec(raw);
  if ('error' in result) {
    return (
      <div className="my-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">No pude dibujar el gráfico</p>
        <p className="mt-0.5">{result.error}</p>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-white/60 p-2 font-mono text-[11px] text-slate-700">
          {raw}
        </pre>
      </div>
    );
  }

  const spec = result;

  // ── Pie ──────────────────────────────────────────────────────────
  if (spec.type === 'pie') {
    const nameKey = spec.nameKey ?? spec.xKey ?? 'name';
    const valueKey = spec.valueKey ?? spec.yKeys?.[0] ?? 'value';
    const total = spec.data.reduce((sum, row) => {
      const v = row[valueKey];
      return sum + (typeof v === 'number' ? v : Number(v) || 0);
    }, 0);
    return (
      <ChartFrame title={spec.title}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={spec.data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(entry) => {
                const payload = (entry as { payload?: Record<string, unknown> }).payload ?? {};
                const v = payload[valueKey];
                const n = typeof v === 'number' ? v : Number(v) || 0;
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return `${payload[nameKey] ?? ''} (${pct}%)`;
              }}
              labelLine={false}
            >
              {spec.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatNumber(v, spec.unit)} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  // ── Bar / Line / Area ────────────────────────────────────────────
  const xKey = spec.xKey ?? 'name';
  const yKeys = spec.yKeys && spec.yKeys.length > 0 ? spec.yKeys : ['value'];

  const sharedAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} />
      <YAxis
        tick={{ fontSize: 11, fill: '#64748b' }}
        tickFormatter={(v) => formatNumber(v, spec.unit)}
      />
      <Tooltip formatter={(v: unknown) => formatNumber(v, spec.unit)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>
  );

  const renderChart = () => {
    if (spec.type === 'bar') {
      return (
        <BarChart data={spec.data}>
          {sharedAxes}
          {yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={spec.stacked ? 'a' : undefined}
            />
          ))}
        </BarChart>
      );
    }
    if (spec.type === 'line') {
      return (
        <LineChart data={spec.data}>
          {sharedAxes}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      );
    }
    return (
      <AreaChart data={spec.data}>
        {sharedAxes}
        {yKeys.map((key, i) => (
          <Area
            key={key}
            dataKey={key}
            type="monotone"
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.18}
            strokeWidth={2}
            stackId={spec.stacked ? 'a' : undefined}
          />
        ))}
      </AreaChart>
    );
  };

  return (
    <ChartFrame title={spec.title}>
      <ResponsiveContainer width="100%" height={260}>
        {renderChart()}
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function ChartFrame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && (
        <p className="mb-2 text-[12px] font-semibold text-slate-700">{title}</p>
      )}
      {children}
    </div>
  );
}
