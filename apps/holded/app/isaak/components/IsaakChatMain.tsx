'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  ImageIcon,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

type Message = {
  role: 'user' | 'assistant' | 'tool-indicator';
  content: string;
  toolsUsed?: string[];
};

type QuickChip = { label: string; query: string };

const QUICK_CHIPS_BY_CONTEXT: Record<string, QuickChip[]> = {
  default: [
    {
      label: '¿Cómo va el mes?',
      query: '¿Cuánto he facturado este mes y qué está pendiente de cobro?',
    },
    { label: 'Facturas vencidas', query: '¿Qué facturas tengo vencidas sin cobrar?' },
    { label: 'IVA trimestral', query: '¿Cuánto IVA debo pagar este trimestre?' },
    {
      label: 'Top clientes',
      query: '¿Cuáles son mis 5 mejores clientes por facturación este año?',
    },
    { label: 'Saldo tesorería', query: '¿Cuál es el saldo actual de mis cuentas de tesorería?' },
    { label: 'Gastos del mes', query: '¿Cuánto he gastado este mes en compras a proveedores?' },
  ],
  ventas: [
    { label: 'Facturación este mes', query: '¿Cuánto he facturado este mes?' },
    { label: 'Facturas pendientes', query: '¿Qué facturas están pendientes de cobro?' },
    { label: 'Top clientes', query: '¿Cuáles son mis mejores clientes este trimestre?' },
    { label: 'Facturas vencidas', query: '¿Qué facturas tienen más de 30 días vencidas?' },
    { label: 'Presupuestos abiertos', query: '¿Qué presupuestos tengo sin confirmar?' },
  ],
  gastos: [
    { label: 'Gastos del mes', query: '¿Cuánto he gastado este mes en compras?' },
    {
      label: 'Principales proveedores',
      query: '¿Cuáles son mis principales proveedores por volumen?',
    },
    {
      label: 'Facturas sin pagar',
      query: '¿Qué facturas de proveedores tengo pendientes de pago?',
    },
    {
      label: 'Gastos por categoría',
      query: '¿Cómo se distribuyen mis gastos por categoría contable?',
    },
  ],
  contactos: [
    { label: 'Listar clientes', query: '¿Cuáles son mis clientes activos?' },
    { label: 'Buscar proveedor', query: '¿Qué proveedores tengo registrados?' },
    { label: 'Oportunidades CRM', query: '¿Qué oportunidades tengo abiertas en el CRM?' },
    { label: 'Clientes con deuda', query: '¿Qué clientes me deben dinero?' },
  ],
  equipo: [
    { label: 'Ver empleados', query: '¿Cuántos empleados tengo en el equipo?' },
    { label: 'Proyectos activos', query: '¿Qué proyectos están activos ahora mismo?' },
    { label: 'Horas registradas', query: '¿Cuántas horas se han imputado este mes?' },
  ],
};

const TOOL_LABELS: Record<string, string> = {
  holded_list_documents: 'Consultando facturas…',
  holded_get_document: 'Leyendo factura…',
  holded_list_contacts: 'Consultando contactos…',
  holded_get_contact: 'Leyendo contacto…',
  holded_get_daily_book: 'Revisando diario contable…',
  holded_list_treasury_accounts: 'Consultando tesorería…',
  holded_get_chart_of_accounts: 'Revisando plan de cuentas…',
  holded_list_projects: 'Consultando proyectos…',
  holded_get_project: 'Leyendo proyecto…',
  holded_list_products: 'Consultando productos…',
  holded_list_employees: 'Consultando equipo…',
  holded_list_leads: 'Consultando oportunidades CRM…',
};

type Props = {
  conversationId?: string;
  initialMessages?: Message[];
  context?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
};

export default function IsaakChatMain({
  conversationId,
  initialMessages = [],
  context = 'default',
  welcomeTitle = 'Hola, soy Isaak',
  welcomeSubtitle = 'Tu asistente financiero. Pregúntame sobre tu negocio.',
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId ?? null);
  const [images, setImages] = useState<Array<{ mimeType: string; data: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chips = QUICK_CHIPS_BY_CONTEXT[context] ?? QUICK_CHIPS_BY_CONTEXT.default;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  async function sendMessage(text: string) {
    if (!text.trim() && images.length === 0) return;
    if (loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const indicatorMsg: Message = {
      role: 'tool-indicator',
      content: 'Consultando Holded…',
    };

    setMessages((prev) => [...prev, userMsg, indicatorMsg]);
    setInput('');
    setImages([]);
    setLoading(true);

    try {
      const res = await fetch('/api/isaak/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId,
          images: images.map(({ mimeType, data }) => ({ mimeType, data })),
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        conversationId?: string;
        toolsUsed?: string[];
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== 'tool-indicator'),
          {
            role: 'assistant',
            content: data.error ?? 'Ha ocurrido un error. Inténtalo de nuevo.',
          },
        ]);
        return;
      }

      // Update conversation ID and navigate to it if new
      if (data.conversationId && !activeConvId) {
        setActiveConvId(data.conversationId);
        router.replace(`/isaak/chat/${data.conversationId}`);
        router.refresh(); // refresh sidebar conversation list
      }

      // Build indicator label from tools used
      const toolLabel =
        data.toolsUsed && data.toolsUsed.length > 0
          ? data.toolsUsed.map((t) => TOOL_LABELS[t] ?? t).join(' → ')
          : null;

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'tool-indicator'),
        {
          role: 'assistant',
          content: data.reply ?? '',
          toolsUsed: toolLabel ? [toolLabel] : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'tool-indicator'),
        { role: 'assistant', content: 'Error de conexión. Comprueba tu internet e inténtalo.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - images.length);
    for (const file of files) {
      const data = await fileToBase64(file);
      setImages((prev) => [...prev, { mimeType: file.type, data, name: file.name }]);
    }
    e.target.value = '';
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* ── Messages area ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 shadow-sm">
              <Sparkles size={26} className="text-violet-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{welcomeTitle}</h1>
            <p className="mb-8 max-w-sm text-[15px] text-slate-500">{welcomeSubtitle}</p>
            {/* Quick chips */}
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.query)}
                  disabled={loading}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-600 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation */
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {messages.map((msg, i) => {
              if (msg.role === 'tool-indicator') {
                return (
                  <div key={i} className="flex items-center gap-2 text-[13px] text-slate-400">
                    <Loader2 size={14} className="animate-spin text-violet-500" />
                    <span>{msg.content}</span>
                  </div>
                );
              }

              if (msg.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-3 text-[14px] text-white shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // assistant
              return (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Bot size={16} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Sparkles size={10} className="text-violet-400" />
                        {msg.toolsUsed.join(' · ')}
                      </div>
                    )}
                    <div className="prose prose-slate prose-sm max-w-none leading-relaxed">
                      <MarkdownContent content={msg.content} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ──────────────────────────────────── */}
      <div className="border-t border-slate-100 bg-white px-4 py-3">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="mb-2 flex gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-600">
                  <ImageIcon size={13} />
                  <span className="max-w-[100px] truncate">{img.name}</span>
                </div>
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          {/* Image attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 3 || loading}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors pb-0.5"
            title="Adjuntar imagen"
          >
            <ImageIcon size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregúntame sobre tu negocio…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-[14px] text-slate-900 placeholder-slate-400 outline-none disabled:opacity-60"
            style={{ maxHeight: '160px' }}
          />

          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || (!input.trim() && images.length === 0)}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-slate-400">
          Isaak puede cometer errores. Verifica información financiera importante.
        </p>
      </div>
    </div>
  );
}

// Simple markdown renderer — no external dep needed for this level
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[-| :]+\|/)) {
      const headers = line
        .split('|')
        .filter(Boolean)
        .map((h) => h.trim());
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(
          lines[i]
            .split('|')
            .filter(Boolean)
            .map((c) => c.trim())
        );
        i++;
      }
      elements.push(
        <div key={i} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-[13px]">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="mt-4 mb-1 text-[15px] font-semibold text-slate-900">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="mt-4 mb-2 text-[17px] font-bold text-slate-900">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="mt-3 mb-1 text-[14px] font-semibold text-slate-800">
          {line.slice(4)}
        </h3>
      );
    }
    // List item
    else if (line.match(/^[-*] /)) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-slate-700">
          <InlineText text={line.slice(2)} />
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={i} className="ml-4 list-decimal text-slate-700">
          <InlineText text={line.replace(/^\d+\. /, '')} />
        </li>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-slate-700 leading-relaxed">
          <InlineText text={line} />
        </p>
      );
    }

    i++;
  }

  return <>{elements}</>;
}

function InlineText({ text }: { text: string }) {
  // Handle **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-slate-100 px-1 py-0.5 text-[12px] font-mono text-violet-700"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Section header icons for section pages
export { TrendingUp, TrendingDown, Users };
