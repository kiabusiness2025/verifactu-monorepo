'use client';

import { useState, useEffect, useCallback } from 'react';

interface Movement {
  id: string;
  madeOn: string;
  amount: number;
  description: string;
  payee?: string;
  payer?: string;
  accountId: string;
}

interface ScoreResult {
  movementId: string;
  score: number;
  reasons: string[];
  autoMatched: boolean;
  candidate: {
    expenseId: string;
    amount: number;
    date: string;
    description: string;
    reference: string | null;
  } | null;
}

interface AuditRecord {
  id: string;
  matchScore: number;
  scoreComponents: Record<string, number>;
  evidenceReasons: string[];
  autoMatched: boolean;
  createdAt: string;
  matchedExpense: {
    id: string;
    amount: number;
    date: string;
    description: string;
    reference: string | null;
    category: string;
  } | null;
}

export function MovementsList() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [scores, setScores] = useState<Map<string, ScoreResult>>(new Map());
  const [audits, setAudits] = useState<Map<string, AuditRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<'all' | 'unmatched' | 'suggested'>('unmatched');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Load movements
  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/banks/movements?limit=100');
      if (!res.ok) throw new Error('Failed to load movements');
      const data = await res.json();
      setMovements(data.movements || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading movements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate scores for visible movements
  const generateScores = useCallback(async () => {
    try {
      const res = await fetch('/api/banks/movements/auto-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, limit: 100 }),
      });
      if (!res.ok) throw new Error('Failed to generate scores');
      const data = await res.json();

      const scoresMap = new Map<string, ScoreResult>();
      (data.results || []).forEach((result: ScoreResult) => {
        scoresMap.set(result.movementId, result);
      });
      setScores(scoresMap);
    } catch (err) {
      console.error('Error generating scores:', err);
    }
  }, []);

  // Load audit trail for a movement
  const loadAudit = useCallback(
    async (movementId: string) => {
      try {
        const res = await fetch(`/api/banks/movements/audit?movementId=${movementId}`);
        if (!res.ok) throw new Error('Failed to load audit');
        const data = await res.json();

        const auditsMap = new Map(audits);
        auditsMap.set(movementId, data.audits || []);
        setAudits(auditsMap);
      } catch (err) {
        console.error('Error loading audit:', err);
      }
    },
    [audits]
  );

  // Initial load
  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Generate scores after movements are loaded
  useEffect(() => {
    if (movements.length > 0 && scores.size === 0) {
      generateScores();
    }
  }, [movements, scores, generateScores]);

  // Handle confirm match
  const handleConfirmMatch = useCallback(
    async (movementId: string, expenseId: string) => {
      try {
        setActionInProgress(movementId);
        const res = await fetch(`/api/banks/movements/${movementId}/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenseId, action: 'match' }),
        });
        if (!res.ok) throw new Error('Failed to confirm match');

        // Reload movements
        await loadMovements();
        setExpandedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error confirming match');
      } finally {
        setActionInProgress(null);
      }
    },
    [loadMovements]
  );

  // Handle create expense
  const handleCreateExpense = useCallback(
    async (movementId: string) => {
      try {
        setActionInProgress(movementId);
        const movement = movements.find((m) => m.id === movementId);
        if (!movement) throw new Error('Movement not found');

        const res = await fetch(`/api/banks/movements/${movementId}/create-expense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: movement.description,
            amount: Math.abs(movement.amount),
            date: movement.madeOn,
          }),
        });
        if (!res.ok) throw new Error('Failed to create expense');

        // Reload movements
        await loadMovements();
        setExpandedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error creating expense');
      } finally {
        setActionInProgress(null);
      }
    },
    [movements, loadMovements]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
        <p className="text-slate-600">Cargando movimientos bancarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="font-semibold text-red-900">Error</h2>
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={loadMovements}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const unmatched = movements.filter((m) => !scores.get(m.id)?.autoMatched);
  const suggested = movements.filter((m) => {
    const score = scores.get(m.id);
    return score && !score.autoMatched && score.candidate;
  });

  const filtered =
    filterState === 'unmatched' ? unmatched : filterState === 'suggested' ? suggested : movements;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movimientos Bancarios</h2>
        <p className="text-sm text-slate-600">
          {movements.length} movimientos sin conciliar. Sistema sugiere matches de confianza.
        </p>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterState('unmatched')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filterState === 'unmatched' ? 'bg-[#2361d8] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            Sin concordancia ({unmatched.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterState('suggested')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filterState === 'suggested' ? 'bg-[#2361d8] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            Sugeridos ({suggested.length})
          </button>
        </div>
      </div>

      {/* Movements list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No hay movimientos en esta categoría.
          </div>
        ) : (
          filtered.map((movement) => {
            const score = scores.get(movement.id);
            const audit = audits.get(movement.id);
            const isExpanded = expandedId === movement.id;

            return (
              <div
                key={movement.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                {/* Card summary */}
                <button
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(movement.id);
                      loadAudit(movement.id);
                    }
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {Math.abs(movement.amount).toFixed(2)} €
                      </span>
                      <span className="text-xs text-slate-500">{movement.madeOn}</span>
                      {score?.autoMatched && (
                        <span className="inline-block px-2 py-1 rounded bg-green-100 text-xs font-medium text-green-700">
                          ✓ Auto-concordado
                        </span>
                      )}
                      {score && score.score >= 0.7 && !score.autoMatched && (
                        <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-xs font-medium text-yellow-700">
                          ⚠ Sugerencia ({(score.score * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700 truncate">{movement.description}</p>
                    {score?.reasons && score.reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {score.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 rounded bg-blue-50 text-xs text-blue-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center text-slate-400">
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-200 px-4 py-3 space-y-3 bg-slate-50">
                    {/* Suggested candidate */}
                    {score?.candidate && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-900">Sugerencia concordada</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-800">
                            <strong>{score.candidate.amount.toFixed(2)} €</strong> —{' '}
                            {score.candidate.description}
                          </p>
                          <p className="text-blue-700 text-xs">{score.candidate.date}</p>
                          {score.candidate.reference && (
                            <p className="text-blue-700 text-xs">
                              Ref: {score.candidate.reference}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                            disabled={actionInProgress === movement.id}
                            onClick={() =>
                              handleConfirmMatch(movement.id, score.candidate!.expenseId)
                            }
                          >
                            {actionInProgress === movement.id ? 'Confirmar...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => setExpandedId(null)}
                            disabled={actionInProgress === movement.id}
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Audit history */}
                    {audit && audit.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700">
                          Historial de auditoría
                        </p>
                        <div className="space-y-1 text-xs text-slate-600">
                          {audit.map((record) => (
                            <div
                              key={record.id}
                              className="rounded bg-white p-2 border border-slate-200"
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {record.autoMatched ? '✓' : '◯'} Score:{' '}
                                  <strong>{(record.matchScore * 100).toFixed(0)}%</strong>
                                </span>
                                <span className="text-slate-500">
                                  {new Date(record.createdAt).toLocaleString()}
                                </span>
                              </div>
                              {record.evidenceReasons.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {record.evidenceReasons.map((reason, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs"
                                    >
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Create new expense */}
                    <div className="border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        disabled={actionInProgress === movement.id}
                        onClick={() => handleCreateExpense(movement.id)}
                      >
                        {actionInProgress === movement.id
                          ? 'Creando gasto...'
                          : '+ Crear nuevo gasto'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
