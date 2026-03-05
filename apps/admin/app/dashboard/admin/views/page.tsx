'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { adminGet, adminPatch } from '@/lib/adminApi';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type AdminQuickView = {
  id: string;
  name: string;
  path: string;
  description?: string;
  section?: 'core' | 'operations' | 'integrations' | 'custom';
  hidden?: boolean;
};

const DEFAULT_VIEWS: AdminQuickView[] = [
  {
    id: 'users',
    name: 'Usuarios',
    path: '/dashboard/admin/users',
    description: 'Gestión de usuarios y permisos',
    section: 'core',
    hidden: false,
  },
  {
    id: 'companies',
    name: 'Empresas',
    path: '/dashboard/admin/companies',
    description: 'Alta y mantenimiento de empresas',
    section: 'core',
    hidden: false,
  },
  {
    id: 'integrations',
    name: 'Integraciones',
    path: '/dashboard/admin/integrations',
    description: 'Conexiones y estado técnico',
    section: 'integrations',
    hidden: false,
  },
];

const SECTION_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'operations', label: 'Operaciones' },
  { value: 'integrations', label: 'Integraciones' },
  { value: 'custom', label: 'Personalizado' },
] as const;

function createId() {
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminViewsPage() {
  const [views, setViews] = useState<AdminQuickView[]>(DEFAULT_VIEWS);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify(DEFAULT_VIEWS));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('/dashboard/admin/');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<AdminQuickView['section']>('core');
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => !!editingId, [editingId]);
  const isDirty = useMemo(() => JSON.stringify(views) !== savedSnapshot, [views, savedSnapshot]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await adminGet<{ ok: boolean; views: AdminQuickView[] }>('/api/admin/views?scope=dashboard');
        if (!mounted) return;
        const nextViews = Array.isArray(data.views) && data.views.length > 0 ? data.views : DEFAULT_VIEWS;
        setViews(nextViews);
        setSavedSnapshot(JSON.stringify(nextViews));
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las vistas');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('');
    setPath('/dashboard/admin/');
    setDescription('');
    setSection('core');
    setHidden(false);
  }

  function startEdit(view: AdminQuickView) {
    setEditingId(view.id);
    setName(view.name);
    setPath(view.path);
    setDescription(view.description || '');
    setSection(view.section || 'core');
    setHidden(!!view.hidden);
  }

  function handleSave() {
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) return;

    if (editingId) {
      setViews((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: trimmedName,
                path: trimmedPath,
                description: description.trim(),
                section: section || 'core',
                hidden,
              }
            : item
        )
      );
      resetForm();
      return;
    }

    setViews((prev) => [
      ...prev,
      {
        id: createId(),
        name: trimmedName,
        path: trimmedPath,
        section: section || 'core',
        hidden,
        description: description.trim() || undefined,
      },
    ]);
    resetForm();
  }

  function removeView(id: string) {
    setViews((prev) => prev.filter((view) => view.id !== id));
    if (editingId === id) resetForm();
  }

  function toggleHidden(id: string) {
    setViews((prev) =>
      prev.map((view) => (view.id === id ? { ...view, hidden: !view.hidden } : view))
    );
  }

  function moveView(id: string, direction: 'up' | 'down') {
    setViews((prev) => {
      const index = prev.findIndex((view) => view.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  async function saveViews() {
    try {
      setSaving(true);
      setError(null);
      const data = await adminPatch<{ ok: boolean; views: AdminQuickView[] }>('/api/admin/views', {
        scope: 'dashboard',
        views,
      });
      const normalized = Array.isArray(data.views) ? data.views : views;
      setViews(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar las vistas');
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    setViews(DEFAULT_VIEWS);
    setEditingId(null);
    setName('');
    setPath('/dashboard/admin/');
    setDescription('');
    setSection('core');
    setHidden(false);
  }

  function sectionLabel(value?: AdminQuickView['section']) {
    return SECTION_OPTIONS.find((item) => item.value === (value || 'core'))?.label || 'Core';
  }

  return (
    <main className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Vistas y paneles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Crea y edita accesos rápidos para que el equipo cambie de panel sin fricción.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AccessibleButton onClick={saveViews} disabled={!isDirty || saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </AccessibleButton>
          <AccessibleButton variant="secondary" onClick={restoreDefaults}>
            Restaurar por defecto
          </AccessibleButton>
          {loading ? <span className="text-xs text-slate-500">Cargando vistas...</span> : null}
          {!loading && !isDirty ? <span className="text-xs text-emerald-700">Todo guardado</span> : null}
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {isEditing ? 'Editar vista' : 'Añadir vista'}
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-slate-700">
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ej. Soporte y sesiones"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Ruta
              <input
                value={path}
                onChange={(event) => setPath(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="/dashboard/admin/..."
              />
            </label>
            <label className="block text-sm text-slate-700">
              Sección
              <select
                value={section}
                onChange={(event) => setSection(event.target.value as AdminQuickView['section'])}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {SECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Descripción
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Qué se gestiona en esta vista"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Ocultar vista en el menú
            </label>
            <div className="flex flex-wrap gap-2">
              <AccessibleButton
                onClick={handleSave}
                icon={isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              >
                {isEditing ? 'Guardar cambios' : 'Añadir vista'}
              </AccessibleButton>
              <AccessibleButton variant="secondary" onClick={resetForm}>
                Limpiar
              </AccessibleButton>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            Vistas disponibles
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Usa las flechas para cambiar el orden del menú.
          </p>
          <div className="mt-4 space-y-2">
            {views.map((view, index) => (
              <div
                key={view.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{view.name}</div>
                    <div className="truncate text-xs text-slate-500">{view.path}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                        {sectionLabel(view.section)}
                      </span>
                      {view.hidden ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Oculta
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          Visible
                        </span>
                      )}
                    </div>
                    {view.description ? (
                      <div className="mt-1 text-xs text-slate-600">{view.description}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveView(view.id, 'up')}
                      className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Subir"
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveView(view.id, 'down')}
                      className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Bajar"
                      disabled={index === views.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(view.id)}
                      className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                      title={view.hidden ? 'Mostrar en menú' : 'Ocultar en menú'}
                    >
                      {view.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(view)}
                      className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                      title="Modificar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeView(view.id)}
                      className="rounded-md border border-rose-300 bg-white p-2 text-rose-700 hover:bg-rose-50"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
