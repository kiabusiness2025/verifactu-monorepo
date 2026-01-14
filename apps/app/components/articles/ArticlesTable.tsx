'use client';

import { useState } from 'react';

interface ArticlesTableProps {
  articles: any[];
  loading: boolean;
  onEdit: (article: any) => void;
  onDelete: (id: string) => void;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
}

export function ArticlesTable({
  articles,
  loading,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
}: ArticlesTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (loading && articles.length === 0) {
    return <div className="text-center py-8">Cargando artículos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Precio</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">IVA</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Stock</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900">{article.code}</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{article.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{article.category || '-'}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {parseFloat(article.unitPrice).toFixed(2)}€
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {(parseFloat(article.taxRate) * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">{article.stock || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => onEdit(article)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(article.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Borrar
                  </button>
                  {deleteConfirm === article.id && (
                    <div className="absolute bg-white border border-gray-300 rounded p-3 shadow-lg z-10">
                      <p className="text-sm mb-3">¿Confirmar borrado?</p>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            onDelete(article.id);
                            setDeleteConfirm(null);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                page === pagination.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {articles.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">No hay artículos registrados</div>
      )}
    </div>
  );
}
