'use client';

import { useState } from 'react';
import { useArticles } from '@/lib/hooks/useArticles';
import { ArticlesTable } from './ArticlesTable';
import { ArticlesForm } from './ArticlesForm';

export function ArticlesManager() {
  const { articles, pagination, loading, error, fetchArticles, createArticle, updateArticle, deleteArticle } =
    useArticles();
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const handleCreate = async (data: any) => {
    try {
      await createArticle(data);
      setShowForm(false);
      setEditingArticle(null);
    } catch (err) {
      console.error('Failed to create article:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      if (editingArticle) {
        await updateArticle((editingArticle as any).id, data);
        setShowForm(false);
        setEditingArticle(null);
      }
    } catch (err) {
      console.error('Failed to update article:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle(id);
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Artículos</h1>
        <button
          onClick={() => {
            setEditingArticle(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Artículo'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {showForm ? (
        <ArticlesForm
          article={editingArticle}
          onSubmit={editingArticle ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingArticle(null);
          }}
          loading={loading}
        />
      ) : (
        <>
          <ArticlesTable
            articles={articles}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={(page: number) => fetchArticles(page)}
          />
        </>
      )}
    </div>
  );
}
