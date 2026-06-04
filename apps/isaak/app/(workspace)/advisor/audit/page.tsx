'use client';

// V2.0.4 — Audit log del asesor.
//
// Lista cronológica de acciones del asesor: creación/edición/borrado
// /switch de cliente, perfil fiscal, importaciones, cartas masivas.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Settings2,
  StickyNote,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
} from 'lucide-react';

type AuditEvent = {
  id: string;
  kind: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type KindMeta = { label: string; icon: typeof UserPlus; color: string };

const KIND_META: Record<string, KindMeta> = {
  client_created: { label: 'Cliente creado', icon: UserPlus, color: 'text-emerald-600' },
  client_updated: { label: 'Cliente editado', icon: Pencil, color: 'text-blue-600' },
  client_notes_updated: { label: 'Nota editada', icon: StickyNote, color: 'text-amber-600' },
  client_deleted: { label: 'Cliente eliminado', icon: Trash2, color: 'text-rose-600' },
  client_switched: { label: 'Switch a cliente', icon: UserCheck, color: 'text-[#2361d8]' },
  fiscal_profile_updated: {
    label: 'Perfil fiscal actualizado',
    icon: Settings2,
    color: 'text-purple-600',
  },
  clients_imported: { label: 'Importación CSV', icon: Upload, color: 'text-indigo-600' },
  letters_generated: { label: 'Cartas masivas', icon: Mail, color: 'text-cyan-600' },
};

function summary(ev: AuditEvent): string {
  const m = ev.metadata;
  switch (ev.kind) {
    case 'client_created':
    case 'client_deleted':
    case 'client_switched':
    case 'client_notes_updated':
      return typeof m.alias === 'string' ? m.alias : '';
    case 'client_updated': {
      const alias = typeof m.alias === 'string' ? m.alias : '';
      const fields = Array.isArray(m.fields) ? (m.fields as string[]).join(', ') : '';
      return fields ? `${alias} · ${fields}` : alias;
    }
    case 'fiscal_profile_updated': {
      const modelos = Array.isArray(m.modelos) ? (m.modelos as string[]).join(', ') : '';
      return modelos ? `Modelos: ${modelos}` : 'Sin modelos';
    }
    case 'clients_imported': {
      const c = typeof m.created === 'number' ? m.created : 0;
      const s = typeof m.skipped === 'number' ? m.skipped : 0;
      return `${c} creados · ${s} omitidos`;
    }
    case 'letters_generated': {
      const n = typeof m.count === 'number' ? m.count : 0;
      const s = typeof m.subject === 'string' ? ` · ${m.subject}` : '';
      return `${n} cartas${s}`;
    }
    default:
      return '';
  }
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'hace unos segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdvisorAuditPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    fetch('/api/isaak/advisor/audit?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Link
            href="/advisor"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <ClipboardList size={16} className="text-[#2361d8]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#011c67]">Actividad del asesor</h1>
            <p className="text-[12px] text-slate-500">
              Últimas 100 acciones sobre clientes, perfiles fiscales e importaciones
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {events === null ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <FileText size={20} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] text-slate-500">
              Aún no hay actividad registrada.
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {events.map((ev) => {
              const meta = KIND_META[ev.kind] ?? {
                label: ev.kind,
                icon: FileText,
                color: 'text-slate-500',
              };
              const Icon = meta.icon;
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] hover:border-[#2361d8]/30"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${meta.color}`}>
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-slate-800">{meta.label}</span>
                      <span className="truncate text-slate-500">{summary(ev)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {relativeTime(ev.createdAt)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
