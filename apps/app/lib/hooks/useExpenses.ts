import { useState, useCallback, useEffect } from 'react';

interface Expense {
  id: string;
  tenantId: string;
  supplierId?: string;
  date: string;
  description: string;
  category: string;
  amount: number | string;
  taxRate: number | string;
  accountCode?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useExpenses(initialPage = 1, limit = 20) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: initialPage,
    limit,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(
    async (page = 1, search = '', category = '', fromDate = '', toDate = '') => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(search && { search }),
          ...(category && { category }),
          ...(fromDate && { fromDate }),
          ...(toDate && { toDate }),
        });
        const res = await fetch(`/api/expenses?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch expenses');
        setExpenses(data.expenses);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  const createExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'supplier'>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create expense');
      setExpenses((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update expense');
      setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete expense');
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(initialPage);
  }, [fetchExpenses, initialPage]);

  return {
    expenses,
    pagination,
    loading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
