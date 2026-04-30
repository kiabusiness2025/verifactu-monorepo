'use client';

import { useRef, useState } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

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

export default function IsaakChatSectionHydrated({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [convId] = useState(conversationId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ message: trimmed, conversationId: convId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.reply) throw new Error(data?.error ?? 'Sin respuesta');
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
                <div className="mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <img
                    src="/Personalidad/isaak-avatar-2.png"
                    alt="Isaak"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="max-w-[85%] rounded-2xl bg-[#f5f9ff] px-4 py-3">
                  <SimpleMarkdown text={msg.content} />
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-100">
                <img
                  src="/Personalidad/isaak-avatar-2.png"
                  alt="Isaak"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="rounded-2xl bg-[#f5f9ff] px-4 py-3">
                <Loader2 size={16} className="animate-spin text-[#2361d8]" />
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
        <form
          className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Continúa la conversación..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-white transition hover:bg-[#1d55c2] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}
