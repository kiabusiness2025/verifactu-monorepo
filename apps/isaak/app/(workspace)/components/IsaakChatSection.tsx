'use client';

import { useRef, useState } from 'react';
import { ExternalLink, LifeBuoy, Loader2, Plus, SendHorizonal, Sparkles } from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

const QUICK_CHIPS: Record<string, string[]> = {
  resumen: [
    '¿Cuánto he facturado este mes?',
    '¿Cuáles son mis gastos del mes?',
    '¿Cuánto me deben los clientes?',
    '¿Cuál es mi margen estimado?',
  ],
  ventas: [
    '¿Qué facturas tengo pendientes de cobro?',
    '¿Cuáles son mis mejores clientes?',
    '¿Cuánto he vendido este trimestre?',
    '¿Tengo presupuestos sin convertir?',
  ],
  gastos: [
    '¿Cuáles son mis principales gastos?',
    '¿Cuánto he gastado este mes?',
    '¿Qué proveedores tengo pendientes de pago?',
    '¿Cuál es mi gasto por categoría?',
  ],
  contactos: [
    '¿Cuántos clientes activos tengo?',
    '¿Quiénes son mis mejores clientes?',
    '¿Tengo clientes con facturas vencidas?',
    '¿Cuántos proveedores tengo?',
  ],
  equipo: [
    '¿Cuántos empleados tenemos?',
    '¿Qué proyectos están activos?',
    '¿Hay horas sin registrar este mes?',
    '¿Cómo va el proyecto más activo?',
  ],
  default: [
    '¿Cómo va el mes?',
    'Facturas vencidas',
    'IVA trimestral',
    'Top clientes',
    'Saldo tesorería',
    'Gastos del mes',
  ],
};

// ── Integrations ──────────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { id: 'holded', name: 'Holded', status: 'connected' as const, dotClass: 'bg-[#ff5460]' },
  { id: 'excel', name: 'Excel', status: 'soon' as const, dotClass: 'bg-[#217346]' },
];

const SUPPORT_EMAIL = 'soporte@verifactu.business';

// ── SimpleMarkdown ─────────────────────────────────────────────────────────────
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[14px] leading-relaxed text-slate-700">
      {lines.map((line, i) => {
        if (line.startsWith('### '))
          return (
            <p key={i} className="font-semibold text-slate-900">
              {line.slice(4)}
            </p>
          );
        if (line.startsWith('## '))
          return (
            <p key={i} className="font-bold text-slate-900">
              {line.slice(3)}
            </p>
          );
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <p key={i} className="pl-3">
              · {line.slice(2)}
            </p>
          );
        if (line === '') return <div key={i} className="h-1" />;
        return (
          <p key={i}>
            {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
              part.startsWith('**') ? (
                <strong key={j} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

// ── ChatInput ─────────────────────────────────────────────────────────────────
function ChatInput({
  input,
  loading,
  onChange,
  onSubmit,
  onKeyDown,
  inputRef,
  placeholder = 'Pregunta lo que necesites...',
}: {
  input: string;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
}) {
  return (
    <form
      className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
      />
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-white transition hover:bg-[#1d55c2] disabled:cursor-not-allowed disabled:bg-slate-200"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
      </button>
    </form>
  );
}

// ── IntegrationBar ─────────────────────────────────────────────────────────────
function IntegrationBar() {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Conexiones
      </span>
      {INTEGRATIONS.map((itg) =>
        itg.status === 'connected' ? (
          <span
            key={itg.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 shadow-sm"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${itg.dotClass}`} />
            {itg.name}
            <span className="text-[10px] text-emerald-600">✓</span>
          </span>
        ) : (
          <span
            key={itg.id}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] text-slate-400"
          >
            {itg.name}
            <span className="opacity-70">· próximamente</span>
          </span>
        )
      )}
      <button
        type="button"
        title="Más integraciones próximamente"
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
      >
        <Plus size={10} />
        Añadir
      </button>
    </div>
  );
}

// ── EscalationButton ──────────────────────────────────────────────────────────
function EscalationButton({ messages }: { messages: Message[] }) {
  const subject = encodeURIComponent('Soporte Isaak — necesito ayuda humana');
  const excerpt = messages
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Yo' : 'Isaak'}: ${m.content.slice(0, 200)}`)
    .join('\n\n');
  const body = encodeURIComponent(
    `Hola,\n\nIsaak no ha podido resolver mi consulta. Contexto:\n\n${excerpt || '(sin mensajes aún)'}\n\nNecesito asistencia.\n\nGracias.`
  );

  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
    >
      <LifeBuoy size={11} />
      Escalar a soporte
      <ExternalLink size={10} className="opacity-50" />
    </a>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function IsaakChatSection({
  context = 'default',
  welcomeTitle,
  welcomeSubtitle,
}: {
  context?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chips = QUICK_CHIPS[context] ?? QUICK_CHIPS.default;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const res = await fetch('/api/holded/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        error?: string;
        conversation?: { id: string; title: string };
      } | null;
      if (!res.ok || !data?.reply) throw new Error(data?.error ?? 'Sin respuesta');
      if (data.conversation?.id) setConversationId(data.conversation.id);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.reply! },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Isaak.');
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-xl">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2361d8]/10">
              <Sparkles size={22} className="text-[#2361d8]" />
            </div>
            <p className="text-[18px] font-semibold text-[#011c67]">
              {welcomeTitle ?? 'Hola, soy Isaak'}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {welcomeSubtitle ??
                'Tu asistente financiero. Pregúntame cualquier cosa sobre tu negocio.'}
            </p>
          </div>

          {error && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
              {error}
            </div>
          )}
          <ChatInput
            input={input}
            loading={loading}
            onChange={setInput}
            onSubmit={() => void sendMessage(input)}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            placeholder="Pregúntame sobre tu negocio..."
          />

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void sendMessage(chip)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 shadow-sm transition hover:border-[#2361d8]/40 hover:bg-blue-50 hover:text-[#2361d8]"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <IntegrationBar />
          </div>
        </div>
        <p className="mt-8 text-[11px] text-slate-400">
          Isaak puede cometer errores. Verifica información financiera importante.
        </p>
      </div>
    );
  }

  // ── Chat active ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-[#2361d8] px-4 py-3 text-[14px] leading-relaxed text-white shadow-md">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/10">
                  <Sparkles size={13} className="text-[#2361d8]" />
                </div>
                <div className="max-w-[85%] rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <SimpleMarkdown text={msg.content} />
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2361d8]/10">
                <Loader2 size={13} className="animate-spin text-[#2361d8]" />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="text-[13px] text-slate-400">Isaak está pensando…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        {error && (
          <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
            {error}
          </div>
        )}
        <ChatInput
          input={input}
          loading={loading}
          onChange={setInput}
          onSubmit={() => void sendMessage(input)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <IntegrationBar />
          <EscalationButton messages={messages} />
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Isaak puede cometer errores. Verifica información financiera importante.
        </p>
      </div>
    </div>
  );
}
