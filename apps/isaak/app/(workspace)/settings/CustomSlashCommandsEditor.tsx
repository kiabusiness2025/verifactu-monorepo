'use client';

// V1.7.2 — Editor de slash commands custom del tenant. Se monta dentro
// de la sección "Personalizar Isaak" de /settings.
//
// CRUD inline: añadir, editar, eliminar, guardar todo de golpe vía
// PUT /api/isaak/slash-commands.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';

type CustomSlashCommand = {
  trigger: string;
  label: string;
  description: string;
  expansion: string;
};

const MAX = 20;
const TRIGGER_RE = /^[a-z][a-z0-9-]{0,23}$/;

function slugifyTrigger(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

const EMPTY: CustomSlashCommand = { trigger: '', label: '', description: '', expansion: '' };

export default function CustomSlashCommandsEditor() {
  const [commands, setCommands] = useState<CustomSlashCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/slash-commands', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { commands: CustomSlashCommand[] };
        setCommands(data.commands ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addRow = () => {
    if (commands.length >= MAX) return;
    setCommands((prev) => [...prev, { ...EMPTY }]);
  };

  const removeRow = (idx: number) => {
    setCommands((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<CustomSlashCommand>) => {
    setCommands((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    const cleaned = commands
      .map((c) => ({
        trigger: slugifyTrigger(c.trigger),
        label: c.label.trim() || `/${slugifyTrigger(c.trigger)}`,
        description: c.description.trim(),
        expansion: c.expansion,
      }))
      .filter((c) => TRIGGER_RE.test(c.trigger) && c.expansion.trim().length > 0);

    try {
      const res = await fetch('/api/isaak/slash-commands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: cleaned }),
      });
      const data = (await res.json()) as { commands?: CustomSlashCommand[]; error?: string };
      if (!res.ok) {
        setNotice({ tone: 'err', text: data.error ?? `Error ${res.status}` });
        return;
      }
      setCommands(data.commands ?? []);
      setNotice({
        tone: 'ok',
        text: `Guardado. ${data.commands?.length ?? 0} atajos activos.`,
      });
    } catch (err) {
      setNotice({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Error de red.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Sparkles className="h-3.5 w-3.5 text-[#2361d8]" />
            Atajos personalizados (slash commands)
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Cuando escribas <code className="rounded bg-slate-100 px-1 font-mono">/tu-atajo</code>{' '}
            en el chat, Isaak insertará el texto que definas aquí. Útil para preguntas que
            haces a menudo. Usa <code className="rounded bg-slate-100 px-1 font-mono">{'{cursor}'}</code>{' '}
            donde quieras que aparezca el cursor.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {commands.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                Aún no tienes atajos personalizados. Crea el primero abajo.
              </li>
            )}
            {commands.map((c, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Atajo
                    </label>
                    <div className="mt-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                      <span className="text-slate-400">/</span>
                      <input
                        value={c.trigger}
                        onChange={(e) =>
                          updateRow(i, { trigger: slugifyTrigger(e.target.value) })
                        }
                        placeholder="mi-atajo"
                        className="w-full bg-transparent font-mono outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Descripción (para el picker)
                    </label>
                    <input
                      value={c.description}
                      onChange={(e) => updateRow(i, { description: e.target.value.slice(0, 120) })}
                      placeholder="Lo que verá el usuario en el desplegable"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none placeholder:text-slate-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Eliminar"
                    className="self-end rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Texto que se inserta (usa {'{cursor}'} para posicionar el cursor)
                  </label>
                  <textarea
                    value={c.expansion}
                    onChange={(e) => updateRow(i, { expansion: e.target.value.slice(0, 600) })}
                    rows={2}
                    placeholder="¿Cuánto IVA me toca pagar el trimestre actual? {cursor}"
                    className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs leading-5 outline-none placeholder:text-slate-300"
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={commands.length >= MAX}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Añadir atajo {commands.length > 0 ? `(${commands.length}/${MAX})` : ''}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Guardar atajos
            </button>
          </div>

          {notice && (
            <p
              className={`mt-2 text-[11px] ${
                notice.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {notice.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
