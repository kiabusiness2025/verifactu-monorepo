'use client';

import { AlertTriangle, Bot, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const IVA_R = 40;
const IVA_CIRC = 2 * Math.PI * IVA_R; // 251.33
const IVA_FILL = 9952 / 13130; // 0.7578

const FIN_BARS = [
  { month: 'May', k: '47.3k', pct: 100, change: '+24%', current: true },
  { month: 'Abr', k: '38.1k', pct: 80.6 },
  { month: 'Mar', k: '41.2k', pct: 87.1 },
  { month: 'Feb', k: '33.8k', pct: 71.5 },
  { month: 'Ene', k: '39.5k', pct: 83.5 },
];

const DEMO_TABS = [
  {
    id: 0,
    label: 'Financiero',
    icon: '📊',
    q: '¿Cómo voy este mes comparado con el anterior?',
    a: 'En mayo llevas 47.320 € facturados — un +24% respecto a abril.\n\nGastos del mes: 18.920 € (−8% vs abril).\nResultado neto estimado: 28.400 €\n\n3 facturas pendientes de cobro por 12.800 €.\n¿Preparo un recordatorio de pago para los clientes?',
  },
  {
    id: 1,
    label: 'Fiscal',
    icon: '📋',
    q: '¿Cuánto IVA llevo acumulado este trimestre?',
    a: 'Este T2 llevas:\n\nIVA repercutido (ventas): 9.952 €\nIVA soportado (gastos): 3.178 €\n\nA ingresar en el modelo 303: 6.774 €\nVencimiento: 20 de julio — 62 días.\n\n⚠️ 2 facturas con IVA registrado incorrectamente.',
  },
  {
    id: 2,
    label: 'Bancario',
    icon: '🏦',
    q: '¿Hay movimientos bancarios sin factura asociada este mes?',
    a: 'Sí, encontré 4 transacciones sin conciliar:\n\n· Amazon Business — 1.240 €\n· Iberdrola — 890 €\n· Referencia desconocida — 320 €\n· Proveedor exterior — 2.100 €\n\nTotal sin documentar: 4.550 €\n¿Los categorizo automáticamente?',
  },
];

// ── Animated horizontal bar ──────────────────────────────────────────────────

function Bar({ pct, delay, color = '#2361d8' }: { pct: number; delay: number; color?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 80 + delay);
    return () => clearTimeout(t);
  }, []); // intentional: animate once on mount
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        style={{
          width: `${w}%`,
          height: '100%',
          borderRadius: 9999,
          backgroundColor: color,
          transition: 'width 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      />
    </div>
  );
}

// ── SVG donut chart (IVA) ────────────────────────────────────────────────────

function IVADonut() {
  const [offset, setOffset] = useState(IVA_CIRC);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
      setOffset(IVA_CIRC * (1 - IVA_FILL));
    }, 400);
    return () => clearTimeout(t);
  }, []); // animate once on mount

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
      <circle
        cx="50"
        cy="50"
        r={IVA_R}
        fill="none"
        stroke="rgba(219,234,254,0.25)"
        strokeWidth="9"
      />
      <circle
        cx="50"
        cy="50"
        r={IVA_R}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="9"
        strokeDasharray={`${IVA_CIRC}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{
          transition: ready ? 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 800, fill: '#fff', fontFamily: 'inherit' }}
      >
        6.774€
      </text>
      <text
        x="50"
        y="57"
        textAnchor="middle"
        style={{ fontSize: 6, fill: 'rgba(219,234,254,0.7)', fontFamily: 'inherit' }}
      >
        a ingresar
      </text>
    </svg>
  );
}

// ── Dashboard panels ─────────────────────────────────────────────────────────

function FinancieroDash() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
            Facturado Mayo
          </p>
          <p className="mt-1 text-2xl font-black text-white">47.320 €</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            ↑ +24% vs abril
          </span>
        </div>
        <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
            Resultado Neto
          </p>
          <p className="mt-1 text-2xl font-black text-white">28.400 €</p>
          <p className="mt-0.5 text-[10px] text-blue-200/50">Gastos: 18.920 €</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          Últimos 5 meses
        </p>
        <div className="space-y-2.5">
          {FIN_BARS.map((bar, i) => (
            <div
              key={bar.month}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: '28px 1fr 64px' }}
            >
              <span
                className={`text-[11px] font-bold ${bar.current ? 'text-white' : 'text-blue-200/50'}`}
              >
                {bar.month}
              </span>
              <Bar
                pct={bar.pct}
                delay={i * 130}
                color={bar.current ? '#60a5fa' : 'rgba(147,197,253,0.4)'}
              />
              <div className="text-right">
                <span
                  className={`text-[11px] font-semibold ${bar.current ? 'text-white' : 'text-blue-200/50'}`}
                >
                  {bar.k}
                </span>
                {bar.change && (
                  <span className="ml-1 text-[10px] font-bold text-emerald-400">{bar.change}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
        <AlertTriangle size={12} className="shrink-0 text-amber-400" />
        <p className="text-[11px] font-semibold text-amber-200">
          3 facturas pendientes de cobro — 12.800 €
        </p>
      </div>
    </div>
  );
}

function FiscalDash() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          IVA T2 2026 — Estimación
        </p>
        <div className="flex items-center gap-4">
          <IVADonut />
          <div className="flex-1 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-blue-100">Repercutido (ventas)</span>
                <span className="font-bold text-white">9.952 €</span>
              </div>
              <Bar pct={100} delay={250} color="#60a5fa" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-blue-100">Soportado (gastos)</span>
                <span className="font-bold text-white">3.178 €</span>
              </div>
              <Bar pct={32} delay={400} color="rgba(147,197,253,0.5)" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#2361d8]">
            <p className="text-[8px] font-bold uppercase leading-none text-white/70">jul</p>
            <p className="text-lg font-black leading-none text-white">20</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Modelo 303 — Vencimiento</p>
            <p className="text-[11px] text-blue-200/60">62 días · A ingresar: 6.774 €</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2.5">
        <AlertTriangle size={12} className="shrink-0 text-rose-400" />
        <p className="text-[11px] font-semibold text-rose-200">
          2 facturas con IVA registrado incorrectamente
        </p>
      </div>
    </div>
  );
}

function BancarioDash() {
  const [progW, setProgW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgW(92), 200);
    return () => clearTimeout(t);
  }, []); // animate once on mount

  const txs = [
    { label: 'Amazon Business', amount: '1.240 €' },
    { label: 'Iberdrola', amount: '890 €' },
    { label: 'Ref. desconocida', amount: '320 €' },
    { label: 'Proveedor exterior', amount: '2.100 €' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          Conciliación bancaria — Mayo
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-black text-white">92%</p>
            <p className="text-[10px] text-blue-200/60">47 movimientos conciliados</p>
          </div>
          <p className="text-[11px] font-semibold text-amber-300">4 pendientes</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            style={{
              width: `${progW}%`,
              height: '100%',
              borderRadius: 9999,
              background: 'linear-gradient(90deg, #2361d8, #60a5fa)',
              transition: 'width 1.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          Sin documentar — 4.550 €
        </p>
        <div className="space-y-1.5">
          {txs.map((tx, i) => (
            <div
              key={tx.label}
              className="isaak-slide-msg flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              style={{ animationDelay: `${250 + i * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span className="text-[12px] font-medium text-blue-100">{tx.label}</span>
              </div>
              <span className="text-[12px] font-bold text-white">{tx.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5">
        <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
        <p className="text-[11px] font-semibold text-emerald-200">
          Isaak puede categorizarlos automáticamente
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function IsaakLiveDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [phase, setPhase] = useState<'q' | 'typing' | 'a'>('q');

  const tab = DEMO_TABS[activeTab] ?? DEMO_TABS[0]!;

  useEffect(() => {
    setPhase('q');
    const t1 = setTimeout(() => setPhase('typing'), 900);
    const t2 = setTimeout(() => setPhase('a'), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeTab]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0d1f4e] to-[#010b2e] shadow-2xl shadow-blue-900/50">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-500/60" />
            <div className="h-3 w-3 rounded-full bg-amber-500/60" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="ml-2 flex items-center gap-1.5 text-[11px] font-semibold text-blue-200/40">
            <Bot size={11} />
            Isaak · IA empresarial
          </div>
        </div>
        {/* Tab selector */}
        <div className="flex items-center gap-1">
          {DEMO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-[#2361d8] text-white shadow-sm shadow-blue-500/30'
                  : 'text-blue-300/50 hover:bg-white/8 hover:text-blue-100'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split layout */}
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        {/* ── Chat panel ── */}
        <div className="flex min-h-[340px] flex-col gap-3 border-b border-white/8 px-5 py-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/30">
            Conversación
          </p>

          {/* User question */}
          <div key={`q-${activeTab}`} className="isaak-slide-msg flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2361d8] px-4 py-3">
              <p className="text-[13px] font-medium leading-relaxed text-white">{tab.q}</p>
            </div>
          </div>

          {/* Typing dots */}
          {phase === 'typing' && (
            <div className="isaak-slide-msg flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/25">
                <Bot size={12} className="text-blue-300" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                <div className="isaak-typing-dots flex items-center gap-1.5">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {/* Isaak answer */}
          {phase === 'a' && (
            <div key={`a-${activeTab}`} className="isaak-slide-msg flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/25">
                <Bot size={12} className="text-blue-300" />
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                {tab.a.split('\n').map((line, i) =>
                  line.trim() === '' ? (
                    <div key={i} className="h-2" />
                  ) : (
                    <p key={i} className="text-[13px] leading-relaxed text-blue-100">
                      {line}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Dashboard panel ── */}
        <div className="px-5 py-5" key={`dash-${activeTab}`}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-blue-300/30">
            Panel de datos en tiempo real
          </p>
          {activeTab === 0 && <FinancieroDash />}
          {activeTab === 1 && <FiscalDash />}
          {activeTab === 2 && <BancarioDash />}
        </div>
      </div>
    </div>
  );
}
