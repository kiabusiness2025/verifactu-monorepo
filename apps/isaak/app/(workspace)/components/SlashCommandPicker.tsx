'use client';

// V1.2 — Slash command picker para el composer del chat.
//
// Cuando el usuario empieza el mensaje con "/", aparece un popover sobre
// el textarea con los comandos disponibles filtrados por lo que sigue.
// Selección con ↑/↓ + Enter, Tab o click. Esc cierra. Click fuera cierra.
//
// Cada comando expande a un texto prefijado en el textarea (no envía
// automáticamente — el usuario completa y pulsa enviar). Algunos terminan
// con un placeholder entre comillas para que el usuario rellene.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bot,
  Briefcase,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Landmark,
  Receipt,
  Scale,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type SlashCommand = {
  trigger: string; // sin "/", lo añade el picker
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * Texto que se inserta en el input al elegir el comando. Si contiene
   * `{cursor}`, el cursor del textarea se posiciona ahí tras el reemplazo.
   */
  expansion: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    trigger: 'factura',
    label: '/factura',
    description: 'Crear borrador de factura emitida',
    icon: Receipt,
    expansion: 'Crea un borrador de factura para {cursor}',
  },
  {
    trigger: 'iva',
    label: '/iva',
    description: '¿Cuánto IVA tengo a pagar este trimestre?',
    icon: Landmark,
    expansion: '¿Cuánto IVA tengo a pagar este trimestre?',
  },
  {
    trigger: '303',
    label: '/303',
    description: 'Calcular borrador del modelo 303',
    icon: FileSpreadsheet,
    expansion: 'Calcula el borrador del modelo 303 del trimestre actual',
  },
  {
    trigger: 'informe',
    label: '/informe',
    description: 'Generar resumen ejecutivo del mes en PDF',
    icon: FileText,
    expansion: 'Genera el resumen ejecutivo del mes en PDF',
  },
  {
    trigger: 'libro-iva',
    label: '/libro-iva',
    description: 'Exportar libro IVA emitidas a Excel',
    icon: FileSpreadsheet,
    expansion: 'Exporta el libro IVA emitidas del trimestre actual a Excel',
  },
  {
    trigger: 'cliente',
    label: '/cliente',
    description: 'Buscar un cliente por nombre o NIF',
    icon: Users,
    expansion: 'Búscame el cliente {cursor}',
  },
  {
    trigger: 'conciliar',
    label: '/conciliar',
    description: 'Movimientos bancarios sin conciliar',
    icon: Landmark,
    expansion: '¿Qué movimientos bancarios tengo sin conciliar este mes?',
  },
  {
    trigger: 'gastos',
    label: '/gastos',
    description: 'Top categorías de gasto del periodo',
    icon: Receipt,
    expansion: '¿Cuáles son mis 10 mayores categorías de gasto este trimestre?',
  },
  {
    trigger: 'alertas',
    label: '/alertas',
    description: 'Próximos vencimientos AEAT',
    icon: Bell,
    expansion: '¿Qué vencimientos AEAT tengo en los próximos 30 días?',
  },
  {
    trigger: 'legal',
    label: '/legal',
    description: 'Asesor Legal — revisar contrato',
    icon: Scale,
    expansion: 'Revísame este contrato:\n\n{cursor}',
  },
  {
    trigger: 'carta-aeat',
    label: '/carta-aeat',
    description: 'Redactar carta para la AEAT (Word)',
    icon: FileText,
    expansion: 'Redacta una carta para la AEAT sobre {cursor}',
  },
  {
    trigger: 'propuesta',
    label: '/propuesta',
    description: 'Propuesta comercial a cliente (Word)',
    icon: Briefcase,
    expansion: 'Redacta una propuesta comercial para el cliente {cursor}',
  },
  {
    trigger: 'buscar',
    label: '/buscar',
    description: 'Buscar en el corpus AEAT (Inspector)',
    icon: Search,
    expansion: 'Inspector AEAT: {cursor}',
  },
  {
    trigger: 'ayuda',
    label: '/ayuda',
    description: '¿Qué puede hacer Isaak por mí?',
    icon: HelpCircle,
    expansion: '¿Qué cosas puedes hacer por mí? Dame 5 ejemplos concretos.',
  },
];

function matchesQuery(cmd: SlashCommand, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    cmd.trigger.toLowerCase().includes(q) ||
    cmd.label.toLowerCase().includes(q) ||
    cmd.description.toLowerCase().includes(q)
  );
}

export function shouldShowSlashPicker(input: string, caret: number): boolean {
  // Solo cuando el "/" está al principio del input y el cursor está dentro
  // del primer token (sin espacios). Evita disparar el picker en medio de
  // un mensaje largo.
  if (!input.startsWith('/')) return false;
  const firstSpace = input.indexOf(' ');
  const firstNewline = input.indexOf('\n');
  const tokenEnd = Math.min(
    firstSpace === -1 ? input.length : firstSpace,
    firstNewline === -1 ? input.length : firstNewline,
  );
  return caret <= tokenEnd;
}

export function applyExpansion(
  cmd: SlashCommand,
): { value: string; cursorPos: number } {
  const exp = cmd.expansion;
  const cursorMarker = '{cursor}';
  const idx = exp.indexOf(cursorMarker);
  if (idx === -1) {
    return { value: exp, cursorPos: exp.length };
  }
  const value = exp.replace(cursorMarker, '');
  return { value, cursorPos: idx };
}

type Props = {
  input: string;
  caret: number;
  onPick: (expansion: { value: string; cursorPos: number }) => void;
  onClose: () => void;
  /** Para registrar el handler de teclado externo del textarea. */
  registerKeyHandler?: (handler: (e: React.KeyboardEvent) => boolean) => void;
};

export default function SlashCommandPicker({
  input,
  caret,
  onPick,
  onClose,
  registerKeyHandler,
}: Props) {
  const query = input.startsWith('/') ? input.slice(1).split(/[\s\n]/)[0] : '';
  const filtered = useMemo(
    () => SLASH_COMMANDS.filter((c) => matchesQuery(c, query)),
    [query],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll del item activo a la vista.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Registro del handler de teclas que el composer delega al picker.
  useEffect(() => {
    if (!registerKeyHandler) return;
    const handler = (e: React.KeyboardEvent): boolean => {
      if (filtered.length === 0) {
        if (e.key === 'Escape') {
          onClose();
          return true;
        }
        return false;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        onPick(applyExpansion(filtered[activeIndex]));
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return true;
      }
      return false;
    };
    registerKeyHandler(handler);
    return () => registerKeyHandler(() => false);
  }, [registerKeyHandler, filtered, activeIndex, onPick, onClose]);

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]">
        <div className="px-4 py-3 text-[12px] text-slate-500">
          No hay comandos que coincidan con
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            /{query}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Sparkles size={11} className="text-[#2361d8]" />
          Comandos rápidos
        </div>
        <span className="text-[10px] text-slate-400">↑↓ navegar · ↵ usar · esc cerrar</span>
      </div>
      <ul ref={listRef} className="max-h-[280px] overflow-y-auto py-1">
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon;
          const active = i === activeIndex;
          return (
            <li key={cmd.trigger}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  // mousedown (no click) para no perder foco del textarea
                  e.preventDefault();
                  onPick(applyExpansion(cmd));
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                  active ? 'bg-[#2361d8]/8' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    active ? 'bg-[#2361d8] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`font-mono text-[12px] font-semibold ${
                        active ? 'text-[#2361d8]' : 'text-slate-800'
                      }`}
                    >
                      {cmd.label}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {cmd.description}
                  </span>
                </span>
                {active && <Bot size={11} className="flex-shrink-0 text-[#2361d8]" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
