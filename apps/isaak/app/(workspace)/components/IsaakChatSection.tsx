'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  FileText,
  LifeBuoy,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  SendHorizonal,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import IsaakMarkdown from './IsaakMarkdown';

// ── Speech API minimal types ──────────────────────────────────────────────────
interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}
interface ISpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: ISpeechRecognitionResult;
}
interface ISpeechRecognitionEvent extends Event {
  readonly results: ISpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
}
type ISpeechRecognitionCtor = new () => ISpeechRecognition;

function getSpeechRecognition(): ISpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: ISpeechRecognitionCtor;
    webkitSpeechRecognition?: ISpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type QuotaHitState = { message: string; resetsAt: string | null; ctaUrl: string };

function QuotaHitBanner({ quotaHit }: { quotaHit: QuotaHitState }) {
  const hoursLeft = quotaHit.resetsAt
    ? Math.max(1, Math.ceil((new Date(quotaHit.resetsAt).getTime() - Date.now()) / 3_600_000))
    : null;
  const isPricing = quotaHit.ctaUrl === '/pricing';

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Zap size={13} className="text-amber-600" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-amber-900">Límite diario alcanzado</p>
          <p className="mt-0.5 text-[12px] text-amber-800 leading-relaxed">{quotaHit.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={quotaHit.ctaUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2361d8] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1d55c2]"
            >
              <Zap size={12} />
              {isPricing ? 'Ver planes →' : 'Crear cuenta gratis →'}
            </Link>
            {hoursLeft !== null && (
              <span className="text-[11px] text-amber-600">Vuelve en {hoursLeft}h</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpgradeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] py-2 px-4 text-[#1e40af]">
      <Zap size={13} className="shrink-0 text-[#2361d8]" />
      <span className="flex-1 text-[12px]">
        Plan gratuito · <strong>10 mensajes/día</strong>. Amplía con Pro para uso ilimitado.
      </span>
      <Link
        href="/pricing"
        className="shrink-0 text-[12px] font-semibold underline text-[#2361d8] whitespace-nowrap"
      >
        Ver planes →
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar"
        className="ml-1 shrink-0 text-[#60a5fa] hover:text-[#1e40af] transition"
      >
        <X size={13} />
      </button>
    </div>
  );
}

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

const QUICK_CHIPS_NO_HOLDED = [
  '¿Qué puedo hacer aquí?',
  'Cómo organizar mi flujo fiscal',
  'Qué necesito para empezar',
  'Recordatorios de obligaciones',
];

// ── Integrations ──────────────────────────────────────────────────────────────
const SUPPORT_EMAIL = 'soporte@verifactu.business';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function buildWelcomeTitle(name?: string | null) {
  const greeting = getTimeGreeting();
  if (name && name.trim().length > 0) {
    const first = name.trim().split(/\s+/)[0];
    return `${greeting}, ${first}`;
  }
  return `${greeting}, soy Isaak`;
}

// ── ChatInput ─────────────────────────────────────────────────────────────────
function ChatInput({
  input,
  loading,
  onChange,
  onSubmit,
  onKeyDown,
  onFileSelect,
  selectedFile,
  onClearFile,
  onMicClick,
  isListening,
  inputRef,
  placeholder = 'Pregunta lo que necesites...',
}: {
  input: string;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFileSelect?: (file: File) => void;
  selectedFile?: File | null;
  onClearFile?: () => void;
  onMicClick?: () => void;
  isListening?: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
          <FileText size={13} className="shrink-0 text-[#2361d8]" />
          <span className="flex-1 truncate text-[12px] font-medium text-[#2361d8]">
            {selectedFile.name}
          </span>
          <button
            type="button"
            onClick={onClearFile}
            className="shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Quitar archivo"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <form
        className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-slate-300 focus-within:shadow-md transition"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {onFileSelect && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              title="Subir factura o ticket (PDF, JPG, PNG)"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Subir factura o ticket"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
            >
              <Paperclip size={14} />
            </button>
          </>
        )}
        {onMicClick && (
          <button
            type="button"
            onClick={onMicClick}
            disabled={loading}
            title={isListening ? 'Detener grabación' : 'Hablar con Isaak'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed ${
              isListening
                ? 'animate-pulse bg-rose-100 text-rose-500 hover:bg-rose-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isListening
              ? 'Escuchando...'
              : selectedFile
                ? 'Añade un comentario o pulsa enviar...'
                : placeholder
          }
          rows={1}
          className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !selectedFile)}
          aria-label="Enviar mensaje"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
        </button>
      </form>
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
  userName,
  holdedConnected = false,
  isFreePlan = false,
}: {
  context?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  userName?: string | null;
  holdedConnected?: boolean;
  isFreePlan?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, 'thumbs_up' | 'thumbs_down'>>({});
  const [quotaHit, setQuotaHit] = useState<QuotaHitState | null>(null);
  const [upgradeBannerDismissed, setUpgradeBannerDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Stop TTS when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleMic = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (event: ISpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        rec.stop();
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }, [isListening]);

  const speakMessage = useCallback(
    (id: string, text: string) => {
      if (!('speechSynthesis' in window)) return;
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const plain = text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`+([^`]+)`+/g, '$1')
        .replace(/^#+\s+/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/\n{2,}/g, '. ');
      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
      if (spanishVoice) utterance.voice = spanishVoice;
      utterance.onstart = () => setSpeakingId(id);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    },
    [speakingId]
  );

  const sendFeedback = useCallback(
    async (assistantMsgId: string, rating: 'thumbs_up' | 'thumbs_down', allMessages: Message[]) => {
      if (ratings[assistantMsgId]) return;
      setRatings((prev) => ({ ...prev, [assistantMsgId]: rating }));

      const idx = allMessages.findIndex((m) => m.id === assistantMsgId);
      const assistantMsg = allMessages[idx];
      const userMsg = idx > 0 ? allMessages[idx - 1] : null;
      if (!assistantMsg || !userMsg || userMsg.role !== 'user') return;

      void fetch('/api/holded/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg.content,
          response: assistantMsg.content,
          rating,
          conversationId: conversationId ?? undefined,
        }),
      }).catch(() => {
        // non-blocking
      });
    },
    [ratings, conversationId]
  );

  const chips = holdedConnected
    ? (QUICK_CHIPS[context] ?? QUICK_CHIPS.default)
    : QUICK_CHIPS_NO_HOLDED;

  const sendMessage = async (text: string) => {
    // If a file is pending and the user submits, handle as file upload
    if (selectedFile && !text.trim()) {
      await uploadFile(selectedFile);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const endpoint = holdedConnected ? '/api/holded/chat' : '/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        response?: string;
        error?: string;
        message?: string;
        resetsAt?: string;
        ctaUrl?: string;
        conversation?: { id: string; title: string };
      } | null;
      if (res.status === 429 && data?.error === 'daily_limit_reached') {
        setQuotaHit({
          message: data.message ?? 'Has alcanzado el límite diario.',
          resetsAt: data.resetsAt ?? null,
          ctaUrl: data.ctaUrl ?? '/pricing',
        });
        return;
      }
      const assistantReply = data?.reply ?? data?.response;
      const nextConversationId = data?.conversation?.id;
      if (!res.ok || !assistantReply) throw new Error(data?.error ?? 'Sin respuesta');
      if (nextConversationId && !conversationId) {
        setConversationId(nextConversationId);
        router.refresh();
      } else if (nextConversationId) {
        setConversationId(nextConversationId);
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: assistantReply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Isaak.');
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const uploadFile = async (file: File) => {
    if (loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: `📎 ${file.name}` },
    ]);
    setSelectedFile(null);
    setLoading(true);
    setError(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) formData.append('conversationId', conversationId);
      const res = await fetch('/api/holded/upload-expense', { method: 'POST', body: formData });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        error?: string;
        conversation?: { id: string; title: string };
      } | null;
      if (!data?.reply) throw new Error(data?.error ?? 'Sin respuesta');
      if (data.conversation?.id && !conversationId) {
        setConversationId(data.conversation.id);
        router.refresh();
      } else if (data.conversation?.id) {
        setConversationId(data.conversation.id);
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.reply! },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo.');
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) void uploadFile(selectedFile);
      else void sendMessage(input);
    }
  };

  // ── Welcome screen (Claude-style, sin IntegrationBar) ─────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10">
          {/* Saludo grande, centrado, claude-style */}
          <div className="mb-8 text-center">
            <p className="text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">
              {welcomeTitle ?? buildWelcomeTitle(userName)}
            </p>
            {welcomeSubtitle && (
              <p className="mt-2 text-[15px] text-slate-500">{welcomeSubtitle}</p>
            )}
          </div>

          {/* Composer arriba */}
          {quotaHit ? (
            <QuotaHitBanner quotaHit={quotaHit} />
          ) : (
            <>
              {error && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
                  {error}
                </div>
              )}
              <ChatInput
                input={input}
                loading={loading}
                onChange={setInput}
                onSubmit={() =>
                  selectedFile ? void uploadFile(selectedFile) : void sendMessage(input)
                }
                onKeyDown={handleKeyDown}
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClearFile={() => setSelectedFile(null)}
                onMicClick={toggleMic}
                isListening={isListening}
                inputRef={inputRef}
                placeholder="Pregúntame sobre tu negocio..."
              />
              {isFreePlan && !upgradeBannerDismissed && (
                <div className="mt-2">
                  <UpgradeBanner onDismiss={() => setUpgradeBannerDismissed(true)} />
                </div>
              )}
            </>
          )}

          {/* Chips de sugerencias */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void sendMessage(chip)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                {chip}
              </button>
            ))}
            {!holdedConnected && (
              <button
                type="button"
                onClick={() => router.push('/integrations')}
                className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-[13px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              >
                Conectar tu contabilidad →
              </button>
            )}
          </div>
        </div>
        <p className="pb-4 text-center text-[11px] text-slate-400">
          Isaak puede cometer errores. Verifica información financiera importante.
        </p>
      </div>
    );
  }

  // ── Chat active (Claude-style: sin burbujas excesivas, ancho 3xl) ─────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              // Usuario: texto plano alineado derecha con fondo sutil
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2.5 text-[15px] leading-relaxed text-slate-900">
                  {msg.content}
                </div>
              </div>
            ) : (
              // Assistant: SIN burbuja, solo texto fluyendo con avatar pequeño
              <div key={msg.id} className="group relative flex items-start gap-3">
                <div className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <Image
                    src="/Personalidad/isaak-avatar-verifactu.png"
                    alt="Isaak"
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-[15px] leading-7 text-slate-800">
                    <IsaakMarkdown text={msg.content} />
                  </div>
                  {/* Acciones al hover */}
                  <div className="mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void sendFeedback(msg.id, 'thumbs_up', messages)}
                      title="Buena respuesta"
                      disabled={!!ratings[msg.id]}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-default ${
                        ratings[msg.id] === 'thumbs_up'
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
                      }`}
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(msg.id, 'thumbs_down', messages)}
                      title="Mejorable"
                      disabled={!!ratings[msg.id]}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-default ${
                        ratings[msg.id] === 'thumbs_down'
                          ? 'text-rose-500 bg-rose-50'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-rose-500'
                      }`}
                    >
                      <ThumbsDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => speakMessage(msg.id, msg.content)}
                      title={speakingId === msg.id ? 'Detener' : 'Escuchar respuesta'}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                        speakingId === msg.id
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {speakingId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Image
                  src="/Personalidad/isaak-avatar-verifactu.png"
                  alt="Isaak"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-2 text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer sticky con backdrop blur */}
      <div className="border-t border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-3">
          {quotaHit ? (
            <QuotaHitBanner quotaHit={quotaHit} />
          ) : (
            <>
              {isFreePlan && !upgradeBannerDismissed && (
                <div className="mb-2">
                  <UpgradeBanner onDismiss={() => setUpgradeBannerDismissed(true)} />
                </div>
              )}
              {error && (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
                  {error}
                </div>
              )}
              <ChatInput
                input={input}
                loading={loading}
                onChange={setInput}
                onSubmit={() =>
                  selectedFile ? void uploadFile(selectedFile) : void sendMessage(input)
                }
                onKeyDown={handleKeyDown}
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClearFile={() => setSelectedFile(null)}
                onMicClick={toggleMic}
                isListening={isListening}
                inputRef={inputRef}
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400">
                  Isaak puede cometer errores. Verifica información financiera importante.
                </p>
                <EscalationButton messages={messages} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
