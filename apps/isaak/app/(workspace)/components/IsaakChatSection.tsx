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
  Plus,
  SendHorizonal,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
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
        className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
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
          className="flex-1 resize-none bg-transparent text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !selectedFile)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-white transition hover:bg-[#1d55c2] disabled:cursor-not-allowed disabled:bg-slate-200"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
        </button>
      </form>
    </div>
  );
}

// ── IntegrationBar ─────────────────────────────────────────────────────────────
function IntegrationBar({ holdedConnected }: { holdedConnected: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Conexiones
      </span>
      {holdedConnected ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5460]" />
          Holded
          <span className="text-[10px] text-emerald-600">✓</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] text-slate-400">
          Holded
          <span className="opacity-70">· no conectado</span>
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] text-slate-400">
        Excel
        <span className="opacity-70">· próximamente</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] text-slate-400">
        Google
        <span className="opacity-70">· próximamente</span>
      </span>
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
  userName,
  holdedConnected = false,
}: {
  context?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  userName?: string | null;
  holdedConnected?: boolean;
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
        conversation?: { id: string; title: string };
      } | null;
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

  // ── Empty state ────────────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-xl">
          <div className="mb-5 flex flex-col items-center text-center">
            <p className="text-[18px] font-bold tracking-tight text-[#011c67]">
              {welcomeTitle ?? buildWelcomeTitle(userName)}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {welcomeSubtitle ?? 'Tu asistente fiscal inteligente. Pregúntame lo que necesites.'}
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
            {!holdedConnected && (
              <button
                type="button"
                onClick={() => router.push('/integrations')}
                className="rounded-full border border-[#2361d8]/30 bg-[#edf4ff] px-3 py-1.5 text-[13px] font-medium text-[#2361d8] shadow-sm transition hover:border-[#2361d8]/50 hover:bg-[#e2edff]"
              >
                Conectar Holded
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <IntegrationBar holdedConnected={holdedConnected} />
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
                <div className="relative mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200">
                  <Image
                    src="/Personalidad/isaak-avatar-verifactu.png"
                    alt="Isaak"
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <div className="group relative max-w-[85%]">
                  <div className="rounded-2xl bg-[#f5f9ff] px-4 py-3">
                    <IsaakMarkdown text={msg.content} />
                  </div>
                  <button
                    type="button"
                    onClick={() => speakMessage(msg.id, msg.content)}
                    title={speakingId === msg.id ? 'Detener' : 'Escuchar respuesta'}
                    className={`absolute -bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition opacity-0 group-hover:opacity-100 ${
                      speakingId === msg.id
                        ? 'text-[#2361d8]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {speakingId === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                  </button>
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="relative mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200">
                <Image
                  src="/Personalidad/isaak-avatar-verifactu.png"
                  alt="Isaak"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <div className="rounded-2xl bg-[#f5f9ff] px-4 py-3">
                <Loader2 size={14} className="animate-spin text-[#2361d8]" />
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
          onSubmit={() => (selectedFile ? void uploadFile(selectedFile) : void sendMessage(input))}
          onKeyDown={handleKeyDown}
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onClearFile={() => setSelectedFile(null)}
          onMicClick={toggleMic}
          isListening={isListening}
          inputRef={inputRef}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <IntegrationBar holdedConnected={holdedConnected} />
          <EscalationButton messages={messages} />
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Isaak puede cometer errores. Verifica información financiera importante.
        </p>
      </div>
    </div>
  );
}
