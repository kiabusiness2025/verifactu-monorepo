'use client';

import { FormEvent, useRef, useState } from 'react';
import { Loader2, SendHorizonal, Shield } from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

type Props = { slug: string; companyName: string };

export default function IsaakPublicChat({ slug, companyName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hola, soy el asistente de ${companyName}. ¿En qué puedo ayudarte?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message: trimmed }),
      });

      const data = (await res.json()) as { reply?: string; error?: string; resetsAt?: string };

      if (!res.ok || !data.reply) {
        setError(data.error ?? 'No he podido responder ahora mismo.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply! },
      ]);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch {
      setError('No he podido responder ahora mismo.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  if (!consentGiven) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2361d8]/10">
            <Shield size={22} className="text-[#2361d8]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Antes de continuar</h2>
            <p className="mt-2 text-[13px] leading-6 text-slate-600">
              Este chat está impulsado por inteligencia artificial. Tus mensajes serán procesados
              para generar respuestas. No compartas información personal sensible como contraseñas,
              números de tarjeta o datos bancarios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConsentGiven(true)}
            className="rounded-full bg-[#2361d8] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1f55c0]"
          >
            Entendido, iniciar chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[calc(100vh-280px)] min-h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'assistant'
                  ? 'mr-8 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] leading-6 text-slate-700'
                  : 'ml-8 rounded-[1.25rem] bg-[#2361d8] px-4 py-3 text-[13px] leading-6 text-white'
              }
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className="mr-8 flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
              <Loader2 size={12} className="animate-spin" />
              Pensando…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <form className="flex items-end gap-3" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder={`Escribe tu consulta a ${companyName}…`}
          className="min-h-[64px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[13px] text-slate-900 outline-none transition focus:border-[#2361d8] focus:ring-4 focus:ring-[#2361d8]/10"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2361d8] text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
        </button>
      </form>
    </div>
  );
}
