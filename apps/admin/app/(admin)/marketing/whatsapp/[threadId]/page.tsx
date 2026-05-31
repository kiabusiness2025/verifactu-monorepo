'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { adminGet, adminPatch, adminPost } from '@/lib/adminApi';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  Smile,
  Sparkles,
  UserCheck,
  User2,
} from 'lucide-react';
import type { EmojiClickData } from 'emoji-picker-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────

type WaEvent = {
  id: string;
  direction: 'inbound' | 'outbound';
  eventType: string;
  body: string | null;
  occurredAt: string;
  status: string;
};

type Thread = {
  id: string;
  phoneNumber: string;
  status: string;
  mode: string;
  language: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string; nif: string | null } | null;
  assignedAgent: { id: string; name: string | null; email: string } | null;
  assignedAgentId: string | null;
  events: WaEvent[];
};

type Agent = { id: string; name: string | null; email: string; role: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId ?? '';
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadThread = useCallback(() => {
    adminGet<{ thread: Thread }>(`/api/admin/whatsapp/threads/${threadId}`)
      .then(({ thread }) => setThread(thread))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread, pollKey]);

  useEffect(() => {
    adminGet<{ agents: Agent[] }>('/api/admin/whatsapp/agents')
      .then(({ agents }) => setAgents(agents))
      .catch(console.error);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.events.length]);

  // Poll for new messages every 5s when thread is open
  useEffect(() => {
    pollRef.current = setInterval(() => setPollKey((k) => k + 1), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const toggleMode = async () => {
    if (!thread) return;
    const newMode = thread.mode === 'bot' ? 'human' : 'bot';
    await adminPatch(`/api/admin/whatsapp/threads/${threadId}`, { mode: newMode });
    setThread((t) => (t ? { ...t, mode: newMode } : t));
  };

  const assignAgent = async (agentId: string | null) => {
    setAssigningAgent(true);
    try {
      await adminPatch(`/api/admin/whatsapp/threads/${threadId}`, {
        assignedAgentId: agentId,
      });
      const agent = agents.find((a) => a.id === agentId) ?? null;
      setThread((t) =>
        t
          ? {
              ...t,
              assignedAgentId: agentId,
              assignedAgent: agent ? { id: agent.id, name: agent.name, email: agent.email } : null,
            }
          : t
      );
    } catch {
      alert('Error al asignar agente');
    } finally {
      setAssigningAgent(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !thread || thread.mode !== 'human') return;
    setSending(true);
    try {
      const { event } = await adminPost<{ event: WaEvent }>(
        `/api/admin/whatsapp/threads/${threadId}/send`,
        { message }
      );
      setMessage('');
      setThread((t) =>
        t ? { ...t, events: [...t.events, event], lastMessageAt: event.occurredAt } : t
      );
    } catch (e) {
      alert('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { suggestions: s } = await adminPost<{ suggestions: string[] }>(
        `/api/admin/whatsapp/threads/${threadId}/suggest`,
        {}
      );
      setSuggestions(s);
    } catch {
      // silent
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((m) => m + emojiData.emoji);
    setShowEmoji(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !thread || thread.mode !== 'human') return;
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/whatsapp/threads/${threadId}/send-media`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        alert(`Error al enviar archivo: ${err.error}`);
        return;
      }
      const { event } = (await res.json()) as { event: WaEvent };
      setThread((t) =>
        t ? { ...t, events: [...t.events, event], lastMessageAt: event.occurredAt } : t
      );
    } catch {
      alert('Error al enviar el archivo');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="p-6 text-center text-slate-500">
        Conversación no encontrada.{' '}
        <Link href="/marketing/whatsapp" className="text-emerald-600 underline">
          Volver
        </Link>
      </div>
    );
  }

  // Group events by date
  const groupedEvents: { date: string; events: WaEvent[] }[] = [];
  let lastDate = '';
  for (const ev of thread.events.filter((e) => e.body)) {
    const d = formatDateLabel(ev.occurredAt);
    if (d !== lastDate) {
      groupedEvents.push({ date: d, events: [] });
      lastDate = d;
    }
    groupedEvents[groupedEvents.length - 1].events.push(ev);
  }

  const isHuman = thread.mode === 'human';

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white shrink-0">
        <Link href="/marketing/whatsapp" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-slate-900">{thread.phoneNumber}</span>
            {thread.language && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                {thread.language}
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                thread.status === 'open'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {thread.status}
            </span>
          </div>
          {thread.tenant && (
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              {thread.tenant.name}
              {thread.tenant.nif && ` · ${thread.tenant.nif}`}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isHuman
              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isHuman ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          {isHuman ? 'Modo humano' : 'Modo bot'}
        </button>

        {/* Agent assignment */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            title="Asignar agente"
            value={thread.assignedAgentId ?? ''}
            onChange={(e) => assignAgent(e.target.value || null)}
            disabled={assigningAgent}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 max-w-[140px]"
          >
            <option value="">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.email}
              </option>
            ))}
          </select>
          {assigningAgent && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>

        <button
          type="button"
          title="Actualizar"
          onClick={() => setPollKey((k) => k + 1)}
          className="text-slate-400 hover:text-slate-700 transition-colors p-1.5"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50">
        {groupedEvents.map(({ date, events }) => (
          <div key={date}>
            <div className="text-center text-xs text-slate-400 mb-3">{date}</div>
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`flex mb-2 ${ev.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    ev.direction === 'outbound'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <MessageBubbleContent ev={ev} />
                  <div
                    className={`text-xs mt-1 ${ev.direction === 'outbound' ? 'text-emerald-200' : 'text-slate-400'}`}
                  >
                    {formatTime(ev.occurredAt)}
                    {(ev.eventType === 'human_message' || ev.eventType.startsWith('human_')) && (
                      <span className="ml-1.5 opacity-75">· admin</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* AI Suggestions */}
      {isHuman && (
        <div className="px-5 py-2 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              {loadingSuggestions ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Sugerencias IA
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMessage(s)}
                  className="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg px-3 py-1.5 transition-colors text-left max-w-xs truncate flex items-center gap-1"
                >
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compose bar */}
      <div className="px-5 py-3 border-t border-slate-200 bg-white shrink-0">
        {!isHuman ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
            <Bot className="h-4 w-4" />
            El bot está activo — activa el modo humano para responder manualmente.
          </div>
        ) : (
          <div className="relative">
            {showEmoji && (
              <div className="absolute bottom-14 right-0 z-50">
                <EmojiPicker onEmojiClick={onEmojiClick} height={380} width={320} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                rows={2}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
              />
              {/* Emoji */}
              <button
                type="button"
                title="Emoji"
                onClick={() => setShowEmoji((v) => !v)}
                className={`flex items-center justify-center h-10 w-10 rounded-xl border transition-colors shrink-0 ${
                  showEmoji
                    ? 'bg-amber-50 border-amber-300 text-amber-600'
                    : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Smile className="h-5 w-5" />
              </button>
              {/* File attachment */}
              <input
                ref={fileInputRef}
                type="file"
                title="Adjuntar archivo"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp3,.ogg,.mp4"
                onChange={onFileChange}
              />
              <button
                type="button"
                title="Adjuntar archivo"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-50"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </button>
              {/* Send */}
              <button
                type="button"
                title="Enviar mensaje"
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media bubble renderer ──────────────────────────────────────────────────────

const MEDIA_EVENT_TYPES = new Set(['image', 'document', 'audio', 'video', 'sticker']);

type EventPayload = {
  mediaId?: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
};

function MessageBubbleContent({ ev }: { ev: WaEvent }) {
  const isMedia =
    MEDIA_EVENT_TYPES.has(ev.eventType) ||
    ev.eventType.startsWith('human_image') ||
    ev.eventType.startsWith('human_document') ||
    ev.eventType.startsWith('human_audio') ||
    ev.eventType.startsWith('human_video');

  if (!isMedia) {
    return <p className="whitespace-pre-wrap leading-relaxed">{ev.body}</p>;
  }

  const payload = (ev as WaEvent & { payload?: EventPayload }).payload as EventPayload | undefined;
  const mediaId = payload?.mediaId;
  const filename = payload?.filename;
  const caption = payload?.caption;
  const mimeType = payload?.mimeType ?? '';
  const isImage =
    mimeType.startsWith('image/') || ev.eventType === 'image' || ev.eventType === 'human_image';

  if (isImage && mediaId) {
    return (
      <div className="space-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/whatsapp/media/${mediaId}`}
          alt={caption ?? 'imagen'}
          className="rounded-xl max-w-full max-h-60 object-cover"
        />
        {caption && <p className="text-xs opacity-80">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <FileText className="h-8 w-8 shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{filename ?? ev.eventType}</p>
        {caption && <p className="text-xs opacity-75 truncate">{caption}</p>}
        {mediaId && (
          <a
            href={`/api/admin/whatsapp/media/${mediaId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Descargar
          </a>
        )}
      </div>
    </div>
  );
}
