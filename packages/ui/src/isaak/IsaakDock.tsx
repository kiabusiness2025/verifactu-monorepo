'use client';

import { MessageCircle, Send, Sparkles, UserRoundCog, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useIsaakContext } from './useIsaakContext';

type IsaakTone = 'friendly' | 'professional' | 'minimal';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const TONE_KEY = 'vf_isaak_personality_v1';
const TONE_SEEN_KEY = 'vf_isaak_personality_seen_v1';

const proactiveByModule: Record<
  string,
  { greeting: string; suggestions: string[]; quickResult: string }
> = {
  dashboard: {
    greeting: 'Puedo resumirte ahora mismo qué revisar primero para evitar sorpresas.',
    suggestions: [
      'Qué revisar primero hoy',
      'Riesgos de esta semana',
      'Resumen ejecutivo en 3 puntos',
    ],
    quickResult:
      'Prioriza cobros vencidos, valida gastos sin clasificar y revisa próximos plazos fiscales.',
  },
  invoices: {
    greeting: 'En facturación te ayudo a reducir impagos y priorizar seguimiento.',
    suggestions: ['Facturas críticas', 'Cobros en riesgo', 'Plan de seguimiento de clientes'],
    quickResult:
      'Empieza por facturas vencidas + alto importe, luego clientes reincidentes en demora.',
  },
  customers: {
    greeting: 'Aquí detecto clientes con riesgo o caída de actividad para que actúes antes.',
    suggestions: [
      'Clientes a reactivar',
      'Top clientes por riesgo',
      'Siguiente seguimiento recomendado',
    ],
    quickResult:
      'Segmenta clientes por facturación reciente y antigüedad de cobro para priorizar llamadas.',
  },
  banking: {
    greeting: 'En bancos te ayudo a conciliar más rápido y detectar movimientos anómalos.',
    suggestions: ['Movimientos no conciliados', 'Gastos atípicos', 'Revisión rápida bancaria'],
    quickResult:
      'Conciliar primero movimientos de mayor importe acelera el cierre y reduce errores.',
  },
  settings: {
    greeting: 'Te guío con un checklist de configuración para dejar la cuenta lista hoy.',
    suggestions: [
      'Checklist de configuración',
      'Siguiente ajuste recomendado',
      'Configurar alertas útiles',
    ],
    quickResult:
      'Completa perfil fiscal, revisa notificaciones y activa la integración prioritaria de tu flujo.',
  },
  tenants: {
    greeting: 'En empresas puedo ayudarte a detectar cuentas con mayor fricción operativa.',
    suggestions: ['Empresas con incidencias', 'Prioridad de soporte', 'Riesgos por tenant'],
    quickResult:
      'Prioriza empresas con errores de onboarding y actividad baja para soporte preventivo.',
  },
  users: {
    greeting: 'En usuarios te propongo una revisión rápida de adopción y riesgo de churn.',
    suggestions: ['Usuarios inactivos', 'Usuarios con riesgo', 'Plan de activación'],
    quickResult:
      'Revisa usuarios sin actividad reciente y dispara mensajes de reactivación segmentados.',
  },
  support: {
    greeting: 'En soporte puedo ordenar tickets por impacto y urgencia operativa.',
    suggestions: ['Tickets críticos', 'SLA en riesgo', 'Backlog priorizado'],
    quickResult:
      'Ataca primero tickets bloqueantes de facturación y luego incidencias repetitivas.',
  },
  operations: {
    greeting: 'En operaciones te ayudo con checklist de estabilidad y prevención.',
    suggestions: ['Chequeos operativos', 'Alertas de hoy', 'Acciones preventivas'],
    quickResult:
      'Valida jobs críticos, estado de integraciones y errores nuevos en las últimas 24h.',
  },
  integrations: {
    greeting: 'En integraciones te propongo el orden más seguro para activar y validar conectores.',
    suggestions: ['Orden de integración', 'Checklist post-integración', 'Riesgos de conexión'],
    quickResult: 'Activa una integración cada vez y valida datos con una muestra antes de escalar.',
  },
  isaak: {
    greeting: 'Estoy listo para ayudarte con un plan concreto en este módulo.',
    suggestions: ['Plan de acción de hoy', 'Próximo paso recomendado', 'Resumen en modo ejecutivo'],
    quickResult:
      'Define objetivo del día, ejecuta 1 acción crítica y valida impacto antes del cierre.',
  },
};

const toneMeta: Record<IsaakTone, { label: string; preview: string }> = {
  friendly: { label: 'Amigable', preview: 'Cercano, explicativo y motivador.' },
  professional: { label: 'Profesional', preview: 'Formal y claro, orientado a negocio.' },
  minimal: { label: 'Directo', preview: 'Breve, al punto y sin relleno.' },
};

function isValidTone(value: string | null | undefined): value is IsaakTone {
  return value === 'friendly' || value === 'professional' || value === 'minimal';
}

function styleText(tone: IsaakTone, text: string) {
  if (tone === 'minimal') return text;
  if (tone === 'professional') return `Recomendación: ${text}`;
  return `${text} Si quieres, te lo desgloso paso a paso.`;
}

function IsaakPanel({
  context,
  tone,
  onToneChange,
  showTonePicker,
  setShowTonePicker,
}: {
  context: Record<string, unknown>;
  tone: IsaakTone;
  onToneChange: (nextTone: IsaakTone) => Promise<void> | void;
  showTonePicker: boolean;
  setShowTonePicker: (value: boolean) => void;
}) {
  const moduleKey = String(context.moduleKey ?? 'dashboard');
  const active = proactiveByModule[moduleKey] ?? proactiveByModule.dashboard;
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

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

  function addUserMessage(content: string) {
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };
    const answer: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: styleText(tone, active.quickResult),
    };
    setMessages((prev) => [...prev, userMessage, answer]);
    setInput('');
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

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {active.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addUserMessage(suggestion)}
              className="w-full rounded-lg border bg-card p-2 text-left text-xs hover:bg-muted/40"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'rounded-lg px-3 py-2 text-xs',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-card text-foreground'
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
      </div>

      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          addUserMessage(input.trim());
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Haz una pregunta..."
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" size="icon" className="h-9 w-9">
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
  const proactive = proactiveByModule[moduleKey] ?? proactiveByModule.dashboard;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    async function loadTone() {
      const storedTone = window.localStorage.getItem(TONE_KEY);
      if (isValidTone(storedTone)) {
        setTone(storedTone);
      }

      if (toneApiPath) {
        try {
          const response = await fetch(toneApiPath, { method: 'GET', credentials: 'include' });
          if (response.ok) {
            const data = (await response.json()) as { isaak_tone?: string };
            if (isValidTone(data?.isaak_tone)) {
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
          'fixed bottom-5 right-5 z-50 w-[420px] h-[70vh] rounded-2xl border bg-background shadow overflow-hidden',
          open ? 'block' : 'hidden'
        )}
        style={{ transform: 'translateY(-56px)' }}
      >
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <IsaakPanel
          context={context}
          tone={tone}
          onToneChange={handleToneChange}
          showTonePicker={showTonePicker}
          setShowTonePicker={setShowTonePicker}
        />
      </div>
    </>
  );
}
