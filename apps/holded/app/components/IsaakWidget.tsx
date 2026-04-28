'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageCount?: number;
};

type ImageAttachment = { mimeType: string; data: string; name: string };

type PageContext = 'claude' | 'chatgpt' | 'holded_hub' | 'verifactu' | 'generic';

type Props = {
  page?: PageContext;
};

const GREETING = `Hola, soy Isaak — el copiloto de Verifactu Business.

Puedo ayudarte con los conectores de Holded para Claude y ChatGPT, resolver errores técnicos, recomendarte servicios o responder dudas sobre Holded. ¿En qué puedo ayudarte?`;

const PAGE_SUGGESTIONS: Record<PageContext, string[]> = {
  claude: [
    '¿Cómo conecto Holded con Claude?',
    '¿Qué puedo consultar con el conector MCP?',
    'Error de API key de Holded, ¿qué hago?',
  ],
  chatgpt: [
    '¿Cómo configuro el plugin de Holded en ChatGPT?',
    '¿Qué módulos de Holded están disponibles?',
    'No me aparece el plugin, ¿qué hago?',
  ],
  holded_hub: [
    '¿Qué diferencia hay entre Claude y ChatGPT?',
    'Ver servicios de migración a Holded',
    'Reservar demo gratuita de 15 minutos',
  ],
  verifactu: [
    '¿Qué hace Verifactu Business?',
    '¿Cómo conecto Holded con IA?',
    'Ver todos los servicios disponibles',
  ],
  generic: [
    '¿En qué puedo ayudarte hoy?',
    'Conectar Holded con Claude o ChatGPT',
    'Ver servicios de migración y formación',
  ],
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function fileToBase64(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(',')[1] ?? '';
      resolve({ mimeType: file.type || 'image/png', data, name: file.name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function IsaakAvatar({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/isaak-avatar.png"
      alt="Isaak"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      priority
    />
  );
}

export function IsaakWidget({ page = 'generic' }: Props) {
  const [open, setOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Check session once on mount
  useEffect(() => {
    fetch('/api/auth/session/health')
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.session?.name) {
          setIsRegistered(true);
          setUserName(d.session.name.split(' ')[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Show bubble after 4 s if chat not yet opened
  useEffect(() => {
    if (open || bubbleDismissed) return;
    const t = setTimeout(() => setBubbleVisible(true), 4000);
    return () => clearTimeout(t);
  }, [open, bubbleDismissed]);

  useEffect(() => {
    if (open) setBubbleVisible(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 3);
    const converted = await Promise.all(imageFiles.map(fileToBase64));
    setAttachments((prev) => [...prev, ...converted].slice(0, 3));
  }, []);

  const removeAttachment = useCallback((name: string) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }, []);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && attachments.length === 0) return;
      if (loading) return;

      if (!open) setOpen(true);

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: text || '(imagen adjunta)',
        imageCount: attachments.length || undefined,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setError(null);
      setLoading(true);
      const pendingAttachments = attachments;
      setAttachments([]);

      try {
        const res = await fetch('/api/isaak/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            page,
            conversationId,
            images: pendingAttachments.map(({ mimeType, data }) => ({ mimeType, data })),
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(payload?.error || 'No he podido responder ahora. Inténtalo de nuevo.');
          return;
        }

        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: payload.reply }]);
        if (payload.conversationId) setConversationId(payload.conversationId);
        setExchangeCount((n) => n + 1);
      } catch {
        setError('No he podido conectar con el servidor. Comprueba tu conexión.');
      } finally {
        setLoading(false);
      }
    },
    [input, attachments, loading, page, conversationId, open]
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      setBubbleVisible(false);
      setBubbleDismissed(true);
      setOpen(true);
      // slight delay so chat panel renders before sending
      setTimeout(() => sendMessage(suggestion), 120);
    },
    [sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    setBubbleDismissed(true);
  }, []);

  const showRegisterHint = !isRegistered && exchangeCount === 2;
  const placeholder = userName ? `¿En qué te ayudo, ${userName}?` : '¿En qué puedo ayudarte?';
  const suggestions = PAGE_SUGGESTIONS[page];

  return (
    <>
      {/* Suggestion bubble */}
      {bubbleVisible && !open ? (
        <div className="isaak-bubble fixed bottom-24 right-6 z-50 w-[min(300px,calc(100vw-3rem))] rounded-2xl border border-[#2361d8]/20 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <IsaakAvatar size={22} />
              <span className="text-xs font-semibold text-slate-700">Isaak puede ayudarte</span>
            </div>
            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Cerrar sugerencias"
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1 1l8 8M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestion(s)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-[#2361d8]/40 hover:bg-[#2361d8]/5 hover:text-[#2361d8]"
              >
                {s}
              </button>
            ))}
          </div>
          {/* Arrow pointing down-right toward button */}
          <div className="absolute -bottom-2 right-6 h-3 w-3 rotate-45 border-b border-r border-[#2361d8]/20 bg-white" />
        </div>
      ) : null}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => {
          setBubbleVisible(false);
          setBubbleDismissed(true);
          setOpen((v) => !v);
        }}
        aria-label={open ? 'Cerrar Isaak' : 'Abrir Isaak — Asistente de Verifactu'}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
      >
        {/* Blue ring background */}
        <div className="isaak-gradient absolute inset-0 rounded-full shadow-[0_4px_20px_rgba(35,97,216,0.45)]" />
        {/* White inner ring */}
        <div className="absolute inset-[3px] rounded-full bg-white" />
        {/* Avatar or close icon */}
        <div className="relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full">
          {open ? (
            <div className="isaak-gradient flex h-full w-full items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            <IsaakAvatar size={52} />
          )}
        </div>
        {/* Notification dot when bubble is visible */}
        {bubbleVisible && !open ? (
          <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2361d8] ring-2 ring-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        ) : null}
        <span className="sr-only">Isaak</span>
      </button>

      {/* Chat panel */}
      {open ? (
        <div className="isaak-panel fixed bottom-24 right-6 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="isaak-gradient flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="overflow-hidden rounded-full ring-2 ring-white/30">
                <IsaakAvatar size={36} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Isaak</div>
                <div className="text-xs text-white/70">Verifactu Business · Soporte</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 2l10 10M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="mt-0.5 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
                    <IsaakAvatar size={28} />
                  </div>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.imageCount ? (
                    <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="3"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                        <path
                          d="M3 15l5-5 4 4 3-3 6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {msg.imageCount} imagen{msg.imageCount > 1 ? 'es' : ''}
                    </div>
                  ) : null}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex gap-2">
                <div className="mt-0.5 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
                  <IsaakAvatar size={28} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}

            {showRegisterHint ? (
              <div className="rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 p-3 text-xs leading-5 text-slate-600">
                <span className="font-semibold text-[#2361d8]">Guarda tu historial.</span>{' '}
                Regístrate en Verifactu Business y Isaak recordará esta y tus próximas consultas.{' '}
                <a
                  href="/auth/holded"
                  className="font-semibold text-[#2361d8] underline hover:no-underline"
                >
                  Registrarse gratis →
                </a>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          {/* Attachment previews */}
          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-1">
              {attachments.map((att) => (
                <div
                  key={att.name}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.name)}
                    className="ml-1 text-slate-400 hover:text-red-500"
                    aria-label={`Quitar ${att.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Input area */}
          <div className="border-t border-slate-100 px-3 py-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <textarea
                ref={textRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={loading}
                className="min-h-6 max-h-[100px] flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
              />
              <div className="flex shrink-0 items-center gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                  aria-label="Adjuntar imagen"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading || attachments.length >= 3}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30"
                  aria-label="Adjuntar pantallazo"
                  title="Adjuntar imagen (máx. 3)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path
                      d="M3 15l5-5 4 4 3-3 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={loading || (!input.trim() && attachments.length === 0)}
                  className="isaak-gradient flex h-7 w-7 items-center justify-center rounded-full text-white transition disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-1.5 text-center text-[10px] text-slate-400">
              Isaak · Verifactu Business · soporte@verifactu.business
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
