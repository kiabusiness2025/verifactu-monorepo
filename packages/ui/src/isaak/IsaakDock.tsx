'use client';

import {
  getIsaakDockCopy,
  getIsaakToneMeta,
  isValidIsaakTone,
  normalizeIsaakContext,
  type IsaakTone,
} from '@verifactu/utils/isaak/persona';
import {
  Download,
  FileText,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRoundCog,
  X,
} from 'lucide-react';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import remarkGfm from 'remark-gfm';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useIsaakContext } from './useIsaakContext';

type IsaakChartData = {
  type: 'chart';
  chartType: 'bar' | 'line';
  title?: string;
  xKey: string;
  series: { key: string; label: string; color: string }[];
  data: Record<string, unknown>[];
};

type IsaakExcelData = {
  type: 'excel_export';
  filename: string;
  label?: string;
  headers: string[];
  rows: unknown[][];
};

function IsaakChart({ data }: { data: IsaakChartData }) {
  const ChartComponent = data.chartType === 'line' ? LineChart : BarChart;
  return (
    <div className="my-2 rounded-lg border bg-card p-3">
      {data.title && (
        <div className="mb-2 text-[11px] font-semibold text-slate-600">{data.title}</div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        {data.chartType === 'line' ? (
          <ChartComponent data={data.data} margin={{ top: 4, right: 8, bottom: 4, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={data.xKey} tick={{ fontSize: 8 }} />
            <YAxis tick={{ fontSize: 8 }} />
            <Tooltip contentStyle={{ fontSize: '10px' }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            {data.series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                dot={false}
                name={s.label}
              />
            ))}
          </ChartComponent>
        ) : (
          <ChartComponent data={data.data} margin={{ top: 4, right: 8, bottom: 4, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={data.xKey} tick={{ fontSize: 8 }} />
            <YAxis tick={{ fontSize: 8 }} />
            <Tooltip contentStyle={{ fontSize: '10px' }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            {data.series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} />
            ))}
          </ChartComponent>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function IsaakExcelButton({
  data,
  exportPath,
}: {
  data: IsaakExcelData;
  exportPath: string | null;
}) {
  const [busy, setBusy] = React.useState(false);

  const download = React.useCallback(async () => {
    if (!exportPath || busy) return;
    setBusy(true);
    try {
      const res = await fetch(exportPath, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: data.filename,
          headers: data.headers,
          rows: data.rows,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename.endsWith('.xlsx') ? data.filename : `${data.filename}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silent — best-effort
    } finally {
      setBusy(false);
    }
  }, [exportPath, busy, data]);

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy || !exportPath}
      className="mt-1 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      <Download className="h-3 w-3" />
      {busy ? 'Generando…' : (data.label ?? 'Descargar Excel')}
    </button>
  );
}

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const TONE_KEY = 'vf_isaak_personality_v1';
const TONE_SEEN_KEY = 'vf_isaak_personality_seen_v1';
const toneMeta = getIsaakToneMeta();

function styleText(tone: IsaakTone, text: string) {
  if (tone === 'minimal') return text;
  if (tone === 'professional') return `Recomendacion: ${text}`;
  return `${text} Si quieres, te lo desgloso paso a paso.`;
}

function IsaakPanel({
  context,
  tone,
  active,
  onToneChange,
  showTonePicker,
  setShowTonePicker,
}: {
  context: Record<string, unknown>;
  tone: IsaakTone;
  active: { greeting: string; suggestions: string[]; quickResult: string };
  onToneChange: (nextTone: IsaakTone) => Promise<void> | void;
  showTonePicker: boolean;
  setShowTonePicker: (value: boolean) => void;
}) {
  const moduleKey = String(context.moduleKey ?? 'dashboard');
  const chatApiPath = typeof context.chatApiPath === 'string' ? context.chatApiPath : null;
  const feedbackApiPath =
    typeof context.feedbackApiPath === 'string' ? context.feedbackApiPath : null;
  const exportApiPath = typeof context.exportApiPath === 'string' ? context.exportApiPath : null;
  const uploadApiPath = typeof context.uploadApiPath === 'string' ? context.uploadApiPath : null;
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Record<string, 'thumbs_up' | 'thumbs_down'>>({});
  const [document, setDocument] = React.useState<{
    filename: string;
    text: string;
    pages: number;
  } | null>(null);
  const [uploadState, setUploadState] = React.useState<'idle' | 'uploading' | 'error'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  // Track which user message prompted each assistant reply (for feedback context)
  const lastUserQuestion = React.useRef<string>('');

  React.useEffect(() => {
    setMessages([
      {
        id: `greet-${moduleKey}`,
        role: 'assistant',
        content: styleText(tone, active.greeting),
      },
    ]);
    setInput('');
  }, [moduleKey, tone, active.greeting]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function addUserMessage(content: string) {
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };
    lastUserQuestion.current = content;
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    if (!chatApiPath) {
      const answer: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: styleText(tone, active.quickResult),
      };
      setMessages((prev) => [...prev, answer]);
      return;
    }

    setLoading(true);
    try {
      const history = messages
        .filter((m) => !m.id.startsWith('greet-'))
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(chatApiPath, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content }],
          document: document ? { filename: document.filename, text: document.text } : undefined,
        }),
      });

      const data = (await response.json()) as { role?: string; content?: string; error?: string };
      const answerContent =
        data.content ?? data.error ?? 'No pude obtener una respuesta en este momento.';

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: answerContent },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          content: 'Error de conexión. Inténtalo de nuevo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(
    messageId: string,
    responseText: string,
    rating: 'thumbs_up' | 'thumbs_down'
  ) {
    if (!feedbackApiPath || feedback[messageId]) return;
    setFeedback((prev) => ({ ...prev, [messageId]: rating }));
    try {
      await fetch(feedbackApiPath, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_key: moduleKey,
          question: lastUserQuestion.current,
          response: responseText,
          rating,
        }),
      });
    } catch {
      // Silent — feedback is best-effort
    }
  }

  async function uploadFile(file: File) {
    if (!uploadApiPath || uploadState === 'uploading') return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadState('error');
      return;
    }
    setUploadState('uploading');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(uploadApiPath, { method: 'POST', credentials: 'include', body: fd });
      const data = (await res.json()) as {
        filename?: string;
        text?: string;
        pages?: number;
        error?: string;
      };
      if (data.error || !data.text) {
        setUploadState('error');
        return;
      }
      setDocument({
        filename: data.filename ?? file.name,
        text: data.text,
        pages: data.pages ?? 1,
      });
      setUploadState('idle');
      setMessages((prev) => [
        ...prev,
        {
          id: `doc-${Date.now()}`,
          role: 'assistant',
          content: `📄 Documento cargado: **${data.filename ?? file.name}** (${data.pages ?? 1} pág.). Puedes hacerme preguntas sobre él.`,
        },
      ]);
    } catch {
      setUploadState('error');
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.pdf')) void uploadFile(file);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Isaak</div>
            <div className="text-xs text-muted-foreground">
              Contexto: {String(context.module ?? '')}
            </div>
          </div>
          <Button
            variant="ghost"
            size="default"
            className="h-8 px-2 text-xs"
            onClick={() => setShowTonePicker(!showTonePicker)}
          >
            <UserRoundCog className="h-3.5 w-3.5 mr-1" />
            {toneMeta[tone].label}
          </Button>
        </div>
      </div>

      {showTonePicker ? (
        <div className="border-b p-3 bg-muted/30">
          <div className="text-xs font-semibold mb-2">Elige la personalidad de Isaak</div>
          <div className="grid grid-cols-1 gap-2">
            {(['friendly', 'professional', 'minimal'] as IsaakTone[]).map((option) => (
              <button
                key={option}
                onClick={() => {
                  void onToneChange(option);
                }}
                className={cn(
                  'rounded-lg border p-2 text-left text-xs transition',
                  tone === option
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="font-medium text-foreground">{toneMeta[option].label}</div>
                <div>{toneMeta[option].preview}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="flex-1 p-4 overflow-y-auto"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          {active.suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => void addUserMessage(suggestion)}
              disabled={loading}
              className="w-full rounded-lg border bg-card p-2 text-left text-xs hover:bg-muted/40 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-xs',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-card text-foreground'
                )}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-1">
                          <table className="w-full text-[10px] border-collapse">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border/60 bg-muted/50 px-2 py-1 text-left font-semibold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border/60 px-2 py-1">{children}</td>
                      ),
                      h2: ({ children }) => <h2 className="font-semibold mt-2 mb-1">{children}</h2>,
                      h3: ({ children }) => (
                        <h3 className="font-medium mt-1.5 mb-0.5">{children}</h3>
                      ),
                      pre: ({ children }) => <>{children}</>,
                      code: ({ children }) => {
                        const raw = String(children).trim();
                        if (raw.startsWith('{')) {
                          try {
                            const parsed = JSON.parse(raw) as { type?: string };
                            if (parsed.type === 'chart') {
                              return <IsaakChart data={parsed as IsaakChartData} />;
                            }
                            if (parsed.type === 'excel_export') {
                              return (
                                <IsaakExcelButton
                                  data={parsed as IsaakExcelData}
                                  exportPath={exportApiPath}
                                />
                              );
                            }
                          } catch {
                            // Not a structured block
                          }
                        }
                        return (
                          <code className="rounded bg-muted px-1 font-mono text-[10px]">
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
              {/* Thumbs up/down — only for real assistant replies (not greeting) */}
              {message.role === 'assistant' &&
                !message.id.startsWith('greet-') &&
                !message.id.startsWith('a-err-') &&
                feedbackApiPath && (
                  <div className="flex items-center gap-1 mt-0.5 pl-1">
                    <button
                      type="button"
                      title="Buena respuesta"
                      onClick={() => void sendFeedback(message.id, message.content, 'thumbs_up')}
                      disabled={!!feedback[message.id]}
                      className={cn(
                        'rounded p-0.5 transition',
                        feedback[message.id] === 'thumbs_up'
                          ? 'text-emerald-600'
                          : 'text-muted-foreground hover:text-emerald-600 disabled:opacity-40'
                      )}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Mala respuesta"
                      onClick={() => void sendFeedback(message.id, message.content, 'thumbs_down')}
                      disabled={!!feedback[message.id]}
                      className={cn(
                        'rounded p-0.5 transition',
                        feedback[message.id] === 'thumbs_down'
                          ? 'text-rose-500'
                          : 'text-muted-foreground hover:text-rose-500 disabled:opacity-40'
                      )}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                )}
            </div>
          ))}
          {loading && (
            <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground animate-pulse">
              Pensando…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        className="border-t p-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim() || loading) return;
          void addUserMessage(input.trim());
        }}
      >
        {/* Document badge */}
        {document && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate font-medium">{document.filename}</span>
            <span className="shrink-0 text-blue-400">{document.pages} pág.</span>
            <button
              type="button"
              onClick={() => setDocument(null)}
              className="ml-auto shrink-0 rounded hover:text-blue-900"
              aria-label="Quitar documento"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {uploadState === 'error' && (
          <p className="text-[10px] text-rose-600">Error subiendo el PDF. Máx 10 MB, solo PDF.</p>
        )}
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Adjuntar PDF"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = '';
            }}
          />
          {uploadApiPath && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === 'uploading' || loading}
              title="Adjuntar PDF"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {uploadState === 'uploading' ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
          )}
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={document ? `Pregunta sobre ${document.filename}…` : 'Haz una pregunta...'}
            disabled={loading}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="px-3 pb-3 text-[11px] text-muted-foreground">
        Contexto activo: <span className="font-medium">{String(context.module ?? '')}</span>
      </div>
    </div>
  );
}

export function IsaakDock({ extraContext }: { extraContext?: Record<string, unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [showTonePicker, setShowTonePicker] = React.useState(false);
  const [tone, setTone] = React.useState<IsaakTone>('friendly');
  const context = useIsaakContext(extraContext);
  const toneApiPath = typeof context.toneApiPath === 'string' ? context.toneApiPath : null;
  const moduleKey = String(context.moduleKey ?? 'dashboard');
  const personaContext = normalizeIsaakContext(
    typeof context.personaContext === 'string'
      ? context.personaContext
      : context.appVariant === 'admin'
        ? 'admin'
        : 'dashboard'
  );
  const proactive = getIsaakDockCopy({ moduleKey, tone, context: personaContext });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    async function loadTone() {
      const storedTone = window.localStorage.getItem(TONE_KEY);
      if (isValidIsaakTone(storedTone)) {
        setTone(storedTone);
      }

      if (toneApiPath) {
        try {
          const response = await fetch(toneApiPath, { method: 'GET', credentials: 'include' });
          if (response.ok) {
            const data = (await response.json()) as { isaak_tone?: string };
            if (isValidIsaakTone(data?.isaak_tone)) {
              setTone(data.isaak_tone);
              window.localStorage.setItem(TONE_KEY, data.isaak_tone);
            }
          }
        } catch {
          // Silent fallback to localStorage
        }
      }

      const hasSeenPersonality = window.localStorage.getItem(TONE_SEEN_KEY) === '1';
      if (!hasSeenPersonality) {
        setShowTonePicker(true);
      }
    }

    void loadTone();
  }, [toneApiPath]);

  const handleToneChange = React.useCallback(
    async (nextTone: IsaakTone) => {
      setTone(nextTone);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TONE_KEY, nextTone);
        window.localStorage.setItem(TONE_SEEN_KEY, '1');
      }

      if (toneApiPath) {
        try {
          await fetch(toneApiPath, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isaak_tone: nextTone }),
          });
        } catch {
          // Silent fallback; localStorage already updated.
        }
      }

      setShowTonePicker(false);
    },
    [toneApiPath]
  );

  return (
    <>
      {!open ? (
        <div className="fixed bottom-[88px] right-5 z-40 max-w-[280px] rounded-xl border bg-background p-3 shadow-soft">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <div className="text-xs font-semibold">Sugerencia de Isaak</div>
              <p className="text-xs text-muted-foreground mt-1">{proactive.greeting}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-5 right-5 z-50">
        <Button className="rounded-full shadow-soft" size="icon" onClick={() => setOpen(true)}>
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      <div
        className={cn(
          'fixed bottom-5 right-5 z-50 w-[420px] h-[70vh] -translate-y-14 rounded-2xl border bg-background shadow overflow-hidden',
          open ? 'block' : 'hidden'
        )}
      >
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <IsaakPanel
          context={context}
          tone={tone}
          active={proactive}
          onToneChange={handleToneChange}
          showTonePicker={showTonePicker}
          setShowTonePicker={setShowTonePicker}
        />
      </div>
    </>
  );
}
