'use client';

import { Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    content:
      'Soy Isaak. Si quieres, empezamos por lo importante: ventas, gastos, cobros o dudas fiscales.',
  },
  {
    id: 'welcome-2',
    role: 'assistant',
    content:
      'Puedes preguntarme sin registrarte. Si luego quieres trabajar con más contexto y seguimiento, ya pasamos al espacio completo.',
  },
];

export default function IsaakPublicChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/vertex-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'No hemos podido responder ahora mismo.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            typeof payload?.response === 'string' && payload.response.trim()
              ? payload.response.trim()
              : 'No he podido darte una respuesta clara ahora mismo. Intenta reformular tu pregunta.',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            'He tenido un problema puntual al responder. Si quieres, prueba otra vez con una pregunta más concreta.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <article className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2361d8]">
          <Sparkles className="h-3.5 w-3.5" />
          Acceso abierto
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#011c67] sm:text-3xl">
          Habla con Isaak sin registrarte
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          Este acceso abierto sirve para probar el estilo, el criterio y la claridad de Isaak. Si
          más adelante necesitas memoria, datos reales y seguimiento continuo, lo activamos en tu
          espacio completo.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              <Image
                src="/Personalidad/Isaak avatar 2.png"
                alt="Avatar oficial de Isaak"
                fill
                sizes="56px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Isaak abierto</div>
              <div className="text-sm text-slate-600">
                Respuesta breve, clara y sin tecnicismos.
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-[#f5f9ff] px-4 py-3 text-sm leading-6 text-slate-700">
              Pide ayuda para entender una duda, ordenar prioridades o aterrizar el siguiente paso.
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Sin acceso a tus datos privados hasta que lo actives contigo.</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">Ejemplos útiles para empezar</div>
          <ul className="space-y-2 leading-6">
            <li>Que debería revisar primero si este mes he vendido bien pero voy justo de caja.</li>
            <li>Explícame en simple qué cambia con VeriFactu para una pyme.</li>
            <li>Cómo ordenar gastos y cobros sin perderme en el ERP.</li>
          </ul>
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(1,28,103,0.35)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#081936_0%,#0f2660_45%,#2361d8_100%)] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/35 bg-white/10">
              <Image
                src="/Personalidad/Isaak avatar 2.png"
                alt="Isaak"
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div>
              <div className="text-sm font-semibold">Isaak</div>
              <div className="text-xs text-white/80">Asistente fiscal abierto</div>
            </div>
          </div>
        </div>

        <div className="flex h-[34rem] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 shadow-sm',
                    message.role === 'user'
                      ? 'bg-[#2361d8] text-white'
                      : 'border border-slate-200 bg-white text-slate-700',
                  ].join(' ')}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2361d8]" />
                  Isaak está preparando una respuesta
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isLoading}
                  rows={3}
                  placeholder="Escribe tu pregunta y te contesto con claridad."
                  className="min-h-[88px] flex-1 resize-none rounded-[1rem] border-0 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full bg-[#2361d8] text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label="Enviar mensaje a Isaak"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </article>
    </section>
  );
}
