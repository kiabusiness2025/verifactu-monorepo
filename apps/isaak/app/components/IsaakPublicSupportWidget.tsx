'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, MessageCircleMore, Send, X } from 'lucide-react';
import Image from 'next/image';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_CHIPS = [
  '¿Cuánto cuesta?',
  '¿Qué incluye el plan gratuito?',
  '¿Con qué ERPs funciona?',
  '¿Cómo empiezo?',
];

const WORKSPACE_PREFIXES = [
  '/chat',
  '/resumen',
  '/ventas',
  '/gastos',
  '/contactos',
  '/equipo',
  '/informes',
  '/calendario',
  '/fiscal',
  '/sede',
  '/banking',
  '/mail',
  '/microsoft',
  '/chift',
  '/integrations',
  '/settings',
  '/advisor',
];

export default function IsaakPublicSupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hidden = WORKSPACE_PREFIXES.some((p) => pathname?.startsWith(p));
  if (hidden) return null;

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch('/api/public/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: messages }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? 'Ha ocurrido un error. Inténtalo de nuevo.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Error de conexión. Inténtalo de nuevo.' },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1a40] shadow-[0_20px_60px_-10px_rgba(1,28,103,0.7)] sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
              <Image
                src="/Personalidad/isaak-avatar-2.png"
                alt="Isaak"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-white">Isaak</div>
              <div className="text-[11px] text-slate-400">
                Preguntas sobre planes y contratación
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-white/8 hover:text-slate-300"
              aria-label="Cerrar"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex max-h-[320px] min-h-[200px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <>
                <div className="rounded-xl rounded-tl-none bg-white/8 px-3 py-2.5 text-[13px] leading-6 text-slate-200">
                  ¡Hola! Soy el asistente de Isaak. Puedo orientarte sobre planes, precios y cómo
                  empezar. ¿En qué te ayudo?
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void sendMessage(chip)}
                      className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-medium text-slate-300 transition hover:border-[#2361d8]/60 hover:bg-[#2361d8]/15 hover:text-white"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 text-[13px] leading-6 ${
                    m.role === 'user'
                      ? 'self-end rounded-br-none bg-[#2361d8] text-white'
                      : 'self-start rounded-tl-none bg-white/8 text-slate-200'
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}
            {loading && (
              <div className="self-start rounded-xl rounded-tl-none bg-white/8 px-3 py-2.5">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* CTA to register */}
          <div className="border-t border-white/5 bg-white/3 px-4 py-2.5">
            <a
              href={`${process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.chat'}/auth`}
              className="flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1f55c0]"
            >
              Empezar gratis — sin tarjeta
              <ArrowRight size={13} />
            </a>
          </div>

          {/* Input */}
          <div className="border-t border-white/8 px-3 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                disabled={loading}
                className="flex-1 rounded-xl bg-white/8 px-3 py-2 text-[13px] text-white placeholder-slate-500 outline-none transition focus:bg-white/10 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2361d8] text-white transition hover:bg-[#1f55c0] disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle button */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className="group inline-flex items-center gap-3 rounded-full border border-[#2361d8]/20 bg-[#011c67] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-20px_rgba(1,28,103,0.85)] transition hover:-translate-y-0.5 hover:bg-[#0a2f96]"
          aria-label="Abrir chat de soporte"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.16)]" />
            <MessageCircleMore className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span>¿Tienes preguntas?</span>
            <span className="text-[11px] font-medium text-white/75">Planes y contratación</span>
          </span>
        </button>
      )}
    </div>
  );
}
