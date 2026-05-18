'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, SendHorizonal } from 'lucide-react';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type PageContext = 'claude' | 'chatgpt' | 'holded_hub' | 'verifactu' | 'generic';

type Props = {
  source?: string;
  digest?: string;
  title?: string;
  description?: string;
  endpoint?: string;
  page?: PageContext;
  initialPrompt?: string;
  autoSendInitialPrompt?: boolean;
  className?: string;
};

const QUICK_PROMPTS = [
  'No puedo entrar con mi correo',
  'No encuentro mi API key de Holded',
  'No he recibido el correo de verificacion',
  'Me sale un error al conectar Holded',
];

export default function SupportAssistantClient({
  source,
  digest,
  title,
  description,
  endpoint = '/api/support/chat',
  page = 'generic',
  initialPrompt,
  autoSendInitialPrompt = false,
  className = '',
}: Props) {
  const initialMessage = useMemo(() => {
    const contextBits = [
      source ? `Estoy viendo esta pantalla desde ${source}.` : null,
      digest ? `El codigo de referencia es ${digest}.` : null,
    ].filter(Boolean);

    return [
      {
        id: 'support-welcome',
        role: 'assistant' as const,
        content:
          title ||
          'Canal de soporte Holded. Te guiamos con acceso, verificacion de correo, API key y errores de conexion.',
      },
      {
        id: 'support-context',
        role: 'assistant' as const,
        content:
          contextBits.length > 0
            ? `${contextBits.join(' ')} Cuanto mas concreto seas, antes te llevo al siguiente paso util.`
            : 'Cuanto mas concreto seas, antes te llevo al siguiente paso util.',
      },
    ];
  }, [digest, source, title]);

  const [messages, setMessages] = useState<Message[]>(initialMessage);
  const [input, setInput] = useState(initialPrompt && !autoSendInitialPrompt ? initialPrompt : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCta, setErrorCta] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const autoSentRef = useRef(false);

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || loading) return;

      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'user', content: trimmed },
      ]);
      setInput('');
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            source: source || null,
            digest: digest || null,
            page,
            conversationId,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.reply) {
          setError(data?.error || 'No he podido responder ahora mismo.');
          if (data?.cta) setErrorCta(data.cta as string);
          return;
        }

        setMessages((current) => [
          ...current,
          { id: `assistant-${Date.now()}`, role: 'assistant', content: data.reply },
        ]);
        if (typeof data.conversationId === 'string') {
          setConversationId(data.conversationId);
        }
        setExchangeCount((n) => n + 1);
      } catch (assistantError) {
        setError(
          assistantError instanceof Error
            ? assistantError.message
            : 'No he podido responder ahora mismo.'
        );
      } finally {
        setLoading(false);
      }
    },
    [conversationId, digest, endpoint, loading, page, source]
  );

  useEffect(() => {
    if (!autoSendInitialPrompt || !initialPrompt || autoSentRef.current) return;
    autoSentRef.current = true;
    void sendMessage(initialPrompt);
  }, [autoSendInitialPrompt, initialPrompt, sendMessage]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section
      className={`rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Bot className="h-4 w-4 text-[#ff5460]" />
        Soporte guiado
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {description ||
          'Este chat no necesita login. Sirve para desbloquear acceso, verificacion, API key y errores de conexion.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#ff5460]/30 hover:bg-[#fff7f7]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'assistant'
                ? 'mr-8 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700'
                : 'ml-8 rounded-[1.5rem] bg-[#ff5460] px-4 py-3 text-sm leading-7 text-white'
            }
          >
            {message.content}
          </div>
        ))}
        {loading ? (
          <div className="mr-8 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Preparando respuesta...
          </div>
        ) : null}
      </div>

      {/* Conversion banner — shown after 3 exchanges */}
      {exchangeCount >= 3 ? (
        <div className="mt-4 rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-3">
          <p className="text-sm font-semibold text-[#011c67]">
            ¿Quieres respuestas con tus datos reales?
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            Isaak conecta con Holded para analizar ventas, gastos, cobros y facturas de tu negocio —
            sin que tengas Claude.ai ni ChatGPT.
          </p>
          <a
            href="https://isaak.verifactu.business"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1f55c0]"
          >
            Probar Isaak 14 días gratis →
          </a>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700">{error}</p>
          {errorCta ? (
            <a
              href={errorCta}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#2361d8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1f55c0]"
            >
              Empezar prueba gratuita de Isaak →
            </a>
          ) : null}
        </div>
      ) : null}

      <form className="mt-4 flex items-end gap-3" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder="Describe el problema. Ej: me he registrado pero al entrar me devuelve al acceso."
          className="min-h-[88px] flex-1 resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#ff5460] focus:ring-4 focus:ring-[#ff5460]/10"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ff5460] text-white transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Enviar mensaje"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizonal className="h-5 w-5" />
          )}
        </button>
      </form>
    </section>
  );
}
