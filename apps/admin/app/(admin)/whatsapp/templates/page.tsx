'use client';

import { useEffect, useState } from 'react';
import { adminGet, adminPost } from '@/lib/adminApi';
import { Plus, Tag, Trash2 } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  isActive: boolean;
  createdAt: string;
};

const CATEGORIES = ['general', 'fiscal', 'subscription', 'connector', 'support'];
const CATEGORY_COLORS: Record<string, string> = {
  fiscal: 'bg-amber-100 text-amber-800',
  subscription: 'bg-emerald-100 text-emerald-800',
  connector: 'bg-sky-100 text-sky-800',
  support: 'bg-violet-100 text-violet-800',
  general: 'bg-slate-100 text-slate-600',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'general', language: 'es', body: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    adminGet<{ templates: Template[] }>('/api/admin/whatsapp/templates?active=false')
      .then(({ templates }) => setTemplates(templates))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) {
      setError('Nombre y texto son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminPost('/api/admin/whatsapp/templates', {
        name: form.name.trim(),
        category: form.category,
        language: form.language,
        body: form.body.trim(),
      });
      setForm({ name: '', category: 'general', language: 'es', body: '' });
      setShowForm(false);
      load();
    } catch {
      setError('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const grouped = CATEGORIES.reduce<Record<string, Template[]>>((acc, cat) => {
    acc[cat] = templates.filter((t) => t.category === cat);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas WhatsApp</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Respuestas rápidas que el agente puede reutilizar en modo humano
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <h2 className="font-medium text-slate-900">Nueva plantilla</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="bienvenida_autonomo"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
              <select
                title="Categoría"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Idioma</label>
              <select
                title="Idioma"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="ca">Català</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Texto{' '}
              <span className="text-slate-400 font-normal">
                — usa {'{variable}'} para marcadores dinámicos
              </span>
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="Hola {nombre}, gracias por contactar con Isaak..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError('');
              }}
              className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Template groups */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Sin plantillas. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}
                  >
                    {cat}
                  </span>
                  <span className="text-xs text-slate-400">
                    {items.length} plantilla{items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className={`bg-white border rounded-xl p-4 space-y-2 ${t.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-slate-500 truncate">{t.name}</span>
                        <span className="text-xs text-slate-400 shrink-0 uppercase">
                          {t.language}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {t.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
