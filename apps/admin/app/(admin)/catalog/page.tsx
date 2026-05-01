'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';

type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  featured: boolean;
  active: boolean;
  prices: Array<{ id: string; amount: string; currency: string; billingCycle: string }>;
  createdAt: string;
};

type Category = {
  slug: string;
  name: string;
};

export default function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorySlug, setCategorySlug] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    categorySlug: '',
    description: '',
    featured: false,
  });

  const limit = 50;

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
        if (categorySlug) params.append('category', categorySlug);

        const res = await fetch(`/api/admin/catalog?${params}`);
        if (!res.ok) throw new Error('Failed to load catalog');

        const data = await res.json();
        setItems(data.items);
        setCategories(data.categories);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error('Error loading catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [categorySlug, offset]);

  const handleSubmitNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          categorySlug: formData.categorySlug || categorySlug,
          description: formData.description,
          featured: formData.featured,
          active: true,
        }),
      });

      if (res.ok) {
        setShowNewItemForm(false);
        setFormData({ name: '', slug: '', categorySlug: '', description: '', featured: false });
        setOffset(0);
        setItems([]);
      }
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Operaciones
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Catálogo de servicios</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestiona servicios, integraciones y planes ({total} total)
            </p>
          </div>
          <ShoppingBag className="h-12 w-12 text-[#2361d8]/20" />
        </div>
      </header>

      {/* Filtro de categoría */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            setCategorySlug('');
            setOffset(0);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !categorySlug
              ? 'bg-[#2361d8] text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => {
              setCategorySlug(cat.slug);
              setOffset(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              categorySlug === cat.slug
                ? 'bg-[#2361d8] text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Botón nuevo item */}
      <button
        onClick={() => setShowNewItemForm(!showNewItemForm)}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d55c2]"
      >
        <Plus className="h-4 w-4" />
        Nuevo servicio
      </button>

      {/* Formulario nuevo item */}
      {showNewItemForm && (
        <form
          onSubmit={handleSubmitNewItem}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h3 className="mb-4 font-semibold text-slate-900">Nuevo servicio</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Slug (suscripcion-pyme)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <select
              value={formData.categorySlug}
              onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecciona categoría</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Destacado</span>
            </label>
          </div>
          <textarea
            placeholder="Descripción (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-4 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            rows={3}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowNewItemForm(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Nombre</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Categoría</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Precios</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Estado</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Destacado</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No hay servicios
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.slug}</td>
                  <td className="px-6 py-4 text-slate-600">{item.categorySlug}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      {item.prices.map((p) => (
                        <span
                          key={p.id}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                        >
                          €{parseFloat(p.amount).toFixed(0)}/{p.billingCycle}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.featured ? (
                      <span className="text-sm font-semibold text-[#2361d8]">★</span>
                    ) : (
                      <span className="text-sm text-slate-400">☆</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {new Date(item.createdAt).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="rounded border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}
