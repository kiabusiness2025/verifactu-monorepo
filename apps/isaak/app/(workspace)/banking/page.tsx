'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
  Unlink,
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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (accounts.length > 0) {
      void loadTransactions(selectedAccount ?? undefined);
    }
  }, [accounts, selectedAccount, loadTransactions]);

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
    } catch {
      setError('Error al sincronizar.');
    } finally {
      setSyncing(false);
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
            {/* ── Balance summary ── */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="col-span-1 overflow-hidden rounded-xl border border-[#2361d8]/15 bg-[#2361d8]/5 px-4 py-3 sm:col-span-2">
                <p className="text-[11px] font-medium text-[#2361d8]/70">Saldo total</p>
                <p className="mt-0.5 text-[22px] font-bold text-[#011c67]">
                  {fmtMoney(totalBalance)}
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-500">Cuentas</p>
                <p className="mt-0.5 text-[22px] font-bold text-slate-800">{accounts.length}</p>
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

            {/* ── Transactions ── */}
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

            {/* ── Reconnect ── */}
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
