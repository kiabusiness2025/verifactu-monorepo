'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { Check, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

type AdminQuickView = {
  id: string;
  name: string;
  path: string;
  description?: string;
};

const DEFAULT_VIEWS: AdminQuickView[] = [
  {
    id: 'users',
    name: 'Usuarios',
    path: '/dashboard/admin/users',
    description: 'Gestión de usuarios y permisos',
  },
  {
    id: 'companies',
    name: 'Empresas',
    path: '/dashboard/admin/companies',
    description: 'Alta y mantenimiento de empresas',
  },
  {
    id: 'integrations',
    name: 'Integraciones',
    path: '/dashboard/admin/integrations',
    description: 'Conexiones y estado técnico',
  },
];

function createId() {
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminViewsPage() {
  const [views, setViews] = useState<AdminQuickView[]>(DEFAULT_VIEWS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('/dashboard/admin/');
  const [description, setDescription] = useState('');

  const isEditing = useMemo(() => !!editingId, [editingId]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setPath('/dashboard/admin/');
    setDescription('');
  }

  function startEdit(view: AdminQuickView) {
    setEditingId(view.id);
    setName(view.name);
    setPath(view.path);
    setDescription(view.description || '');
  }

  function handleSave() {
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) return;

    if (editingId) {
      setViews((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, name: trimmedName, path: trimmedPath, description: description.trim() }
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
        description: description.trim() || undefined,
      },
    ]);
    resetForm();
  }

  function removeView(id: string) {
    setViews((prev) => prev.filter((view) => view.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <main className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Vistas y paneles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Crea y edita accesos rápidos para que el equipo cambie de panel sin fricción.
        </p>
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
              Descripción
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Qué se gestiona en esta vista"
              />
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
          <div className="mt-4 space-y-2">
            {views.map((view) => (
              <div
                key={view.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{view.name}</div>
                    <div className="truncate text-xs text-slate-500">{view.path}</div>
                    {view.description ? (
                      <div className="mt-1 text-xs text-slate-600">{view.description}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
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

