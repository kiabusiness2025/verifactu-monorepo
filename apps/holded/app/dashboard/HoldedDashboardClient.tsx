'use client';

import { useState } from 'react';
import { Bot, Building2, CheckCircle2, KeyRound, SendHorizonal, Sparkles } from 'lucide-react';

type SessionInfo = {
  email: string | null;
  tenantId: string | null;
  keyMasked: string | null;
};

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const STARTER_PROMPTS = [
  'Resume mis facturas recientes.',
  'Qué puedo revisar primero en Holded.',
  'Dame un primer resumen de clientes y ventas.',
];

export default function HoldedDashboardClient({ session }: { session: SessionInfo }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ya estás dentro. Tu conexión con Holded está activa y este dashboard será tu punto único de trabajo.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/holded/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'No hemos podido responder ahora mismo.');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch (chatError) {
      setError(
        chatError instanceof Error ? chatError.message : 'No hemos podido responder ahora mismo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-[#ff5460]/15 bg-white px-6 py-6 shadow-[0_32px_90px_-48px_rgba(255,84,96,0.35)] sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5460]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5460]">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard gratuito
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tu entorno Holded ya está listo
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Aquí centralizamos el acceso, la conexión y el primer chat con Isaak sin sacarte a
              otra web.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Sesión
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">
                  {session.email || 'Acceso activo'}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tenant
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">
                  {session.tenantId || 'Preparado'}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  API key
                </div>
                <div className="mt-2 text-sm font-semibold text-emerald-700">
                  {session.keyMasked || 'Conectada'}
                </div>
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-slate-200 bg-[#081936] p-6 text-white shadow-[0_32px_90px_-48px_rgba(8,25,54,0.65)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <CheckCircle2 className="h-4 w-4 text-[#ff8a93]" />
              Conexión activa
            </div>
            <p className="mt-4 text-sm leading-7 text-white/80">
              Holded ya responde con tu API key. El siguiente paso es empezar por una pregunta
              sencilla para comprobar el contexto.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <KeyRound className="h-4 w-4 text-[#ff8a93]" />
                Qué puedes hacer aquí
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">
                <li>Ver si la conexión sigue viva.</li>
                <li>Arrancar tu primer chat con contexto de Holded.</li>
                <li>Usar este dashboard como base del flujo gratuito.</li>
              </ul>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-[#ff5460]" />
              Empieza por aquí
            </div>
            <div className="mt-5 space-y-3">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-medium text-slate-700 transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 px-2 pb-4 text-sm font-semibold text-slate-900">
              <Bot className="h-4 w-4 text-[#ff5460]" />
              Primer chat con Isaak
            </div>

            <div className="max-h-[520px] space-y-4 overflow-y-auto px-2 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === 'assistant'
                      ? 'mr-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700'
                      : 'ml-10 rounded-[1.5rem] bg-[#ff5460] px-4 py-3 text-sm leading-7 text-white'
                  }
                >
                  {message.content}
                </div>
              ))}
              {loading ? (
                <div className="mr-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Isaak está preparando una respuesta...
                </div>
              ) : null}
            </div>

            {error ? <div className="px-2 pb-3 text-sm text-rose-700">{error}</div> : null}

            <form
              className="mt-2 flex items-end gap-3 border-t border-slate-100 px-2 pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Escribe tu primera pregunta sobre Holded..."
                rows={3}
                className="min-h-[88px] flex-1 resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff5460] text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Enviar mensaje"
              >
                <SendHorizonal className="h-5 w-5" />
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
