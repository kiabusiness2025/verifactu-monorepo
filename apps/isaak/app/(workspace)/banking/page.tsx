'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  GitMerge,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Unlink,
  X,
} from 'lucide-react';

type Connection = {
  providerName: string;
  status: string;
  provider: string;
  expiresAt: string | null;
  lastSyncAt: string | null;
};

type Account = {
  id: string;
  name: string;
  nature: string;
  balance: number;
  currency: string;
  iban: string | null;
  status: string;
  connection: Connection;
};

type Transaction = {
  id: string;
  accountId: string;
  status: string;
  madeOn: string;
  amount: number;
  currency: string;
  description: string | null;
  category: string | null;
  payee: string | null;
  payer: string | null;
};

type ReconcileStats = {
  total: number;
  reconciled: number;
  pending: number;
};

type ReconcileSuggestion = {
  tx: {
    id: string;
    amount: number;
    madeOn: string;
    description: string | null;
    payee: string | null;
    category: string | null;
  };
  candidates: {
    expenseId: string;
    score: number;
    evidenceReasons: string[];
  }[];
};

type AutoMatched = {
  txId: string;
  txAmount: number;
  txMadeOn: string;
  txDescription: string;
  expenseId: string | null;
  expenseDescription: string | null;
  expenseSupplier: string | null;
  scorePercent: number;
  matchedAt: string;
};

type Aspsp = {
  name: string;
  country: string;
  logo?: string;
};

function fmtMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function BankingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'movements' | 'reconcile'>('movements');

  // Reconciliation state
  const [reconcileStats, setReconcileStats] = useState<ReconcileStats | null>(null);
  const [suggestions, setSuggestions] = useState<ReconcileSuggestion[]>([]);
  const [autoMatched, setAutoMatched] = useState<AutoMatched[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [confirmingTx, setConfirmingTx] = useState<string | null>(null);
  const [undoingTxId, setUndoingTxId] = useState<string | null>(null);

  // Bank picker (Enable Banking)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAspsps, setPickerAspsps] = useState<Aspsp[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [connectingBank, setConnectingBank] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/banking/saltedge/accounts');
      if (res.ok) {
        const data = (await res.json()) as { accounts: Account[] };
        setAccounts(data.accounts ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (accountId?: string) => {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    const res = await fetch(`/api/isaak/banking/saltedge/transactions?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { transactions: Transaction[] };
      setTransactions(data.transactions ?? []);
    }
  }, []);

  const loadReconcile = useCallback(async () => {
    const res = await fetch('/api/isaak/banking/reconcile');
    if (res.ok) {
      const data = (await res.json()) as {
        stats: ReconcileStats;
        suggestions: ReconcileSuggestion[];
        autoMatched: AutoMatched[];
      };
      setReconcileStats(data.stats ?? null);
      setSuggestions(data.suggestions ?? []);
      setAutoMatched(data.autoMatched ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (accounts.length > 0) {
      void loadTransactions(selectedAccount ?? undefined);
      void loadReconcile();
    }
  }, [accounts, selectedAccount, loadTransactions, loadReconcile]);

  const openBankPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerSearch('');
    if (pickerAspsps.length > 0) return;
    setPickerLoading(true);
    try {
      const res = await fetch('/api/isaak/banking/eb/aspsps?country=ES');
      if (res.ok) {
        const data = (await res.json()) as { aspsps: Aspsp[] };
        setPickerAspsps(data.aspsps ?? []);
      } else {
        setError('No se pudo cargar la lista de bancos.');
      }
    } catch {
      setError('No se pudo cargar la lista de bancos.');
    } finally {
      setPickerLoading(false);
    }
  }, [pickerAspsps.length]);

  async function handleConnectBank(aspspName: string, country: string) {
    setConnectingBank(aspspName);
    setError(null);
    try {
      const res = await fetch('/api/isaak/banking/eb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspspName, country }),
      });
      const data = (await res.json()) as { connect_url?: string; error?: string };
      if (!res.ok || !data.connect_url) {
        setError(data.error ?? 'No se pudo iniciar la conexión.');
        return;
      }
      window.location.href = data.connect_url;
    } catch {
      setError('No se pudo iniciar la conexión bancaria.');
    } finally {
      setConnectingBank(null);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const hasEb = accounts.some((a) => a.connection.provider === 'enablebanking');
      const hasSaltEdge = accounts.some((a) => a.connection.provider === 'saltedge');

      await Promise.allSettled([
        hasEb
          ? fetch('/api/isaak/banking/eb/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
          : Promise.resolve(),
        hasSaltEdge
          ? fetch('/api/isaak/banking/saltedge/accounts', { method: 'POST' })
          : Promise.resolve(),
        hasSaltEdge
          ? fetch('/api/isaak/banking/saltedge/transactions', { method: 'POST' })
          : Promise.resolve(),
      ]);

      await load();
      await loadTransactions(selectedAccount ?? undefined);
      await loadReconcile();
    } catch {
      setError('Error al sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleRunReconcile() {
    setReconciling(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/banking/reconcile', { method: 'POST' });
      if (res.ok) {
        await loadReconcile();
      }
    } catch {
      setError('Error al ejecutar la conciliación.');
    } finally {
      setReconciling(false);
    }
  }

  async function handleConfirm(txId: string, expenseId: string) {
    setConfirmingTx(txId);
    try {
      await fetch('/api/isaak/banking/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', txId, expenseId }),
      });
      await loadReconcile();
    } finally {
      setConfirmingTx(null);
    }
  }

  async function handleDismiss(txId: string) {
    setConfirmingTx(txId);
    try {
      await fetch('/api/isaak/banking/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', txId }),
      });
      await loadReconcile();
    } finally {
      setConfirmingTx(null);
    }
  }

  async function handleUndo(txId: string) {
    setUndoingTxId(txId);
    try {
      await fetch('/api/isaak/banking/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', txId }),
      });
      await loadReconcile();
    } finally {
      setUndoingTxId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const connected = accounts.length > 0;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  // Build unique list of EB connections by provider name to show expiry banners
  const ebExpiring = Array.from(
    new Map(
      accounts
        .filter((a) => a.connection.provider === 'enablebanking' && a.connection.expiresAt)
        .map((a) => {
          const days = daysUntil(a.connection.expiresAt);
          return [
            a.connection.providerName,
            { name: a.connection.providerName, days, expiresAt: a.connection.expiresAt! },
          ] as const;
        })
    ).values()
  )
    .filter((c) => c.days !== null && c.days <= 7)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const filteredAspsps = pickerSearch
    ? pickerAspsps.filter((a) =>
        a.name.toLowerCase().includes(pickerSearch.toLowerCase())
      )
    : pickerAspsps;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Open Banking</h1>
            <p className="text-[12px] text-slate-500">
              Cuentas y movimientos bancarios en tiempo real
            </p>
          </div>
          {connected && (
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              Sincronizar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Expiry warnings ── */}
        {ebExpiring.map((conn) => (
          <div
            key={conn.name}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              (conn.days ?? 0) <= 0
                ? 'border-rose-200 bg-rose-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={14}
                className={`mt-0.5 shrink-0 ${
                  (conn.days ?? 0) <= 0 ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <div>
                <p
                  className={`text-[12px] font-semibold ${
                    (conn.days ?? 0) <= 0 ? 'text-rose-800' : 'text-amber-800'
                  }`}
                >
                  {(conn.days ?? 0) <= 0
                    ? `Tu conexión con ${conn.name} ha expirado`
                    : `Tu conexión con ${conn.name} expira en ${conn.days} día${conn.days === 1 ? '' : 's'}`}
                </p>
                <p
                  className={`mt-0.5 text-[11px] ${
                    (conn.days ?? 0) <= 0 ? 'text-rose-700' : 'text-amber-700'
                  }`}
                >
                  Renueva la conexión para que Isaak siga accediendo a tus movimientos sin
                  interrupción.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleConnectBank(conn.name, 'ES')}
              disabled={connectingBank === conn.name}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-60 ${
                (conn.days ?? 0) <= 0
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {connectingBank === conn.name ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (conn.days ?? 0) <= 0 ? (
                'Reconectar'
              ) : (
                'Renovar'
              )}
            </button>
          </div>
        ))}

        {!connected ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white py-14 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2361d8]/8">
              <Landmark size={26} className="text-[#2361d8]" />
            </div>
            <div className="text-center">
              <h2 className="text-[15px] font-semibold text-slate-900">Conecta tu banco</h2>
              <p className="mt-1.5 max-w-[320px] text-[12px] leading-5 text-slate-500">
                Vincula tu cuenta bancaria para ver saldos y movimientos directamente en Isaak.
                Conexión segura mediante PSD2/Open Banking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openBankPicker()}
              className="flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1f55c0]"
            >
              <Building2 size={14} />
              Conectar banco español
            </button>
            <p className="text-[11px] text-slate-400">
              Tecnología Enable Banking · PSD2 · Acceso de solo lectura
            </p>
          </div>
        ) : (
          <>
            {/* ── Balance + stats summary ── */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="col-span-2 overflow-hidden rounded-xl border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-3">
                <p className="text-[11px] font-medium text-[#2361d8]/70">Saldo total</p>
                <p className="mt-0.5 text-[22px] font-bold text-[#011c67]">
                  {fmtMoney(totalBalance)}
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-500">Cuentas</p>
                <p className="mt-0.5 text-[22px] font-bold text-slate-800">{accounts.length}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-medium text-amber-600">Sin conciliar</p>
                <p className="mt-0.5 text-[22px] font-bold text-amber-800">
                  {reconcileStats?.pending ?? '—'}
                </p>
              </div>
            </div>

            {/* ── Accounts list ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <span className="text-[12px] font-semibold text-slate-700">Cuentas conectadas</span>
              </div>
              <ul className="divide-y divide-slate-50">
                {accounts.map((account) => (
                  <li
                    key={account.id}
                    className={`flex cursor-pointer items-center gap-4 px-5 py-3 transition hover:bg-slate-50 ${
                      selectedAccount === account.id ? 'bg-slate-50' : ''
                    }`}
                    onClick={() =>
                      setSelectedAccount(selectedAccount === account.id ? null : account.id)
                    }
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/10">
                      <Building2 size={16} className="text-[#2361d8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-800">
                          {account.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {account.connection.providerName}
                        </span>
                      </div>
                      {account.iban && (
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {account.iban}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-slate-800">
                        {fmtMoney(account.balance, account.currency)}
                      </p>
                      <div className="mt-0.5 flex items-center justify-end gap-1">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span className="text-[10px] text-emerald-600">Activa</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('movements')}
                className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium transition ${
                  activeTab === 'movements'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Movimientos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reconcile')}
                className={`flex-1 rounded-lg py-1.5 text-[12px] font-medium transition ${
                  activeTab === 'reconcile'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Conciliación
                {(reconcileStats?.pending ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {reconcileStats!.pending}
                  </span>
                )}
              </button>
            </div>

            {/* ── Transactions tab ── */}
            {activeTab === 'movements' && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-700">
                      Movimientos{selectedAccount ? ' — cuenta seleccionada' : ''}
                    </span>
                    {selectedAccount && (
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(null)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        <Unlink size={10} />
                        Ver todas
                      </button>
                    )}
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px] text-slate-400">
                    No hay movimientos. Sincroniza para cargar los últimos 90 días.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {transactions.map((tx) => {
                      const isIncome = tx.amount > 0;
                      return (
                        <li key={tx.id} className="flex items-center gap-4 px-5 py-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isIncome ? 'bg-emerald-50' : 'bg-rose-50'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={14} className="text-emerald-600" />
                            ) : (
                              <ArrowUpRight size={14} className="text-rose-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-slate-800">
                              {tx.description ?? tx.payee ?? tx.payer ?? 'Sin descripción'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {fmtDate(tx.madeOn)}
                              {tx.category ? ` · ${tx.category}` : ''}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[13px] font-semibold ${
                              isIncome ? 'text-emerald-600' : 'text-slate-700'
                            }`}
                          >
                            {isIncome ? '+' : ''}
                            {fmtMoney(tx.amount, tx.currency)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* ── Reconciliation tab ── */}
            {activeTab === 'reconcile' && (
              <div className="space-y-3">
                {/* Stats + run button */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[11px] text-slate-400">Total gastos</p>
                      <p className="text-[18px] font-bold text-slate-800">
                        {reconcileStats?.total ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Conciliados</p>
                      <p className="text-[18px] font-bold text-emerald-600">
                        {reconcileStats?.reconciled ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Pendientes</p>
                      <p className="text-[18px] font-bold text-amber-600">
                        {reconcileStats?.pending ?? '—'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRunReconcile()}
                    disabled={reconciling}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-60"
                  >
                    {reconciling ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <GitMerge size={12} />
                    )}
                    {reconciling ? 'Ejecutando…' : 'Reconciliar'}
                  </button>
                </div>

                {/* Auto-applied matches (≥95% score) */}
                {autoMatched.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/40 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-[12px] font-semibold text-emerald-900">
                          Auto-aplicados ({autoMatched.length})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700">
                        Score ≥95% · Últimos 30 días
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {autoMatched.map((m) => (
                        <li key={m.txId} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[12px] font-medium text-slate-800">
                                {m.txDescription || 'Sin descripción'}
                              </p>
                              <span className="shrink-0 text-[12px] font-semibold text-slate-700">
                                {fmtMoney(Math.abs(m.txAmount))}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-slate-400">
                              {fmtDate(m.txMadeOn)} ↔ {m.expenseSupplier || m.expenseDescription || 'gasto'}
                              {' · '}
                              <span className="font-semibold text-emerald-600">{m.scorePercent}%</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={undoingTxId === m.txId}
                            onClick={() => void handleUndo(m.txId)}
                            title="Deshacer match (falso positivo)"
                            className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            {undoingTxId === m.txId ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              'Deshacer'
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-10 text-center shadow-sm">
                    <CheckCircle2 size={28} className="text-emerald-400" />
                    <p className="text-[13px] font-medium text-slate-600">
                      Sin movimientos pendientes de conciliar
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Sincroniza y ejecuta la conciliación para procesar nuevos movimientos
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-3">
                      <span className="text-[12px] font-semibold text-slate-700">
                        Sugerencias de conciliación
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {suggestions.map(({ tx, candidates }) => (
                        <li key={tx.id} className="px-5 py-4">
                          {/* Transaction row */}
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50">
                              <ArrowUpRight size={14} className="text-rose-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[13px] font-medium text-slate-800">
                                  {tx.description ?? tx.payee ?? 'Sin descripción'}
                                </p>
                                <span className="shrink-0 text-[13px] font-semibold text-slate-700">
                                  {fmtMoney(Math.abs(tx.amount))}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {fmtDate(tx.madeOn)}
                                {tx.category ? ` · ${tx.category}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Candidates */}
                          {candidates.length > 0 ? (
                            <div className="mt-3 space-y-2 pl-11">
                              {candidates.map((c) => (
                                <div
                                  key={c.expenseId}
                                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-flex h-5 min-w-[36px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                          c.score >= 85
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : c.score >= 60
                                              ? 'bg-amber-100 text-amber-700'
                                              : 'bg-slate-200 text-slate-600'
                                        }`}
                                      >
                                        {c.score}%
                                      </span>
                                      <p className="truncate text-[11px] text-slate-600">
                                        {c.evidenceReasons.join(' · ')}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={confirmingTx === tx.id}
                                    onClick={() => void handleConfirm(tx.id, c.expenseId)}
                                    className="flex items-center gap-1 rounded-md bg-[#2361d8] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-50"
                                  >
                                    {confirmingTx === tx.id ? (
                                      <Loader2 size={10} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={10} />
                                    )}
                                    Confirmar
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                disabled={confirmingTx === tx.id}
                                onClick={() => void handleDismiss(tx.id)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
                              >
                                <X size={10} />
                                Descartar
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between pl-11">
                              <p className="text-[11px] text-slate-400">
                                Sin candidatos encontrados
                              </p>
                              <button
                                type="button"
                                disabled={confirmingTx === tx.id}
                                onClick={() => void handleDismiss(tx.id)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
                              >
                                <X size={10} />
                                Descartar
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Add another bank ── */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-[12px] font-medium text-slate-700">
                  Añadir otra cuenta bancaria
                </p>
                <p className="text-[11px] text-slate-400">Puedes conectar varios bancos a la vez</p>
              </div>
              <button
                type="button"
                onClick={() => void openBankPicker()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-[#2361d8] transition hover:bg-[#2361d8]/5"
              >
                <Building2 size={12} />
                Conectar banco
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Bank picker modal ── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => !connectingBank && setPickerOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900">Elige tu banco</h3>
                <p className="text-[11px] text-slate-500">
                  Selecciona el tuyo para conectar mediante PSD2/Open Banking
                </p>
              </div>
              <button
                type="button"
                onClick={() => !connectingBank && setPickerOpen(false)}
                disabled={!!connectingBank}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-3">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar banco…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : filteredAspsps.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12px] text-slate-400">
                  {pickerSearch
                    ? 'No se encontraron bancos con ese nombre.'
                    : 'No hay bancos disponibles.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {filteredAspsps.map((aspsp) => (
                    <li key={`${aspsp.name}-${aspsp.country}`}>
                      <button
                        type="button"
                        disabled={!!connectingBank}
                        onClick={() => void handleConnectBank(aspsp.name, aspsp.country)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                          {aspsp.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={aspsp.logo}
                              alt={aspsp.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Building2 size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-slate-800">
                            {aspsp.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{aspsp.country}</p>
                        </div>
                        {connectingBank === aspsp.name && (
                          <Loader2 size={14} className="animate-spin text-slate-400" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center">
              <p className="text-[10px] text-slate-400">
                Tecnología Enable Banking · Cumple PSD2 · Acceso de solo lectura
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
