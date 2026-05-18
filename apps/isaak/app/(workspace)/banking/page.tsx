'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  GitMerge,
  Landmark,
  Loader2,
  RefreshCw,
  Unlink,
  X,
} from 'lucide-react';

type Account = {
  id: string;
  name: string;
  nature: string;
  balance: number;
  currency: string;
  iban: string | null;
  status: string;
  connection: { providerName: string; status: string };
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

export default function BankingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'movements' | 'reconcile'>('movements');

  // Reconciliation state
  const [reconcileStats, setReconcileStats] = useState<ReconcileStats | null>(null);
  const [suggestions, setSuggestions] = useState<ReconcileSuggestion[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [confirmingTx, setConfirmingTx] = useState<string | null>(null);

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
      };
      setReconcileStats(data.stats ?? null);
      setSuggestions(data.suggestions ?? []);
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

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/banking/saltedge/connect', { method: 'POST' });
      const data = (await res.json()) as { connect_url?: string; error?: string };
      if (!res.ok || !data.connect_url) {
        setError(data.error ?? 'No se pudo iniciar la conexión.');
        return;
      }
      window.location.href = data.connect_url;
    } catch {
      setError('No se pudo iniciar la conexión bancaria.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await fetch('/api/isaak/banking/saltedge/accounts', { method: 'POST' });
      await fetch('/api/isaak/banking/saltedge/transactions', { method: 'POST' });
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const connected = accounts.length > 0;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

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
              onClick={() => void handleConnect()}
              disabled={connecting}
              className="flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Building2 size={14} />
              )}
              {connecting ? 'Iniciando…' : 'Conectar banco español'}
            </button>
            <p className="text-[11px] text-slate-400">
              Tecnología Salt Edge · Acceso de solo lectura · Sin almacenar credenciales
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
                      <div className="flex items-center justify-end gap-1 mt-0.5">
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
                                  <div className="flex-1 min-w-0">
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
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-[#2361d8] transition hover:bg-[#2361d8]/5 disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Building2 size={12} />
                )}
                Conectar banco
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
