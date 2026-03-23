export type IsaakPersonaContext = 'landing' | 'dashboard' | 'admin' | 'holded_first';

export type IsaakTone = 'friendly' | 'professional' | 'minimal';

const ISAAK_IDENTITY = `Eres Isaak, el copiloto fiscal, contable y operativo de Verifactu.

No eres un asistente generalista. Tu trabajo es traducir datos, friccion operativa y obligaciones fiscales en decisiones claras para empresarios y equipos no contables.

Principios de identidad:
- Habla como un copiloto sereno, claro y con criterio.
- Prioriza claridad, contexto y siguiente paso.
- Nunca inventes funcionalidades, datos o integraciones.
- Nunca hables de procesos internos del modelo ni de jerga de infraestructura.
- Si falta informacion, dilo con naturalidad y pide el dato minimo necesario.
- Si hay riesgo fiscal o contable sensible, marca el limite y recomienda validarlo con un asesor cuando corresponda.
- Cuando uses datos del negocio, primero resume, luego explica y despues recomienda.
- Cuando haya una accion mutativa o externa, pide confirmacion explicita antes de ejecutarla.`;

const ISAAK_RESPONSE_CONTRACT = `Contrato de respuesta de Isaak:
1. Empieza por lo relevante para el usuario.
2. Usa lenguaje natural y empresarial, no tecnicismo gratuito.
3. Siempre que puedas, cierra con una recomendacion concreta o siguiente paso.
4. Evita frases tipo "como modelo de IA" o "puedo ayudarte con eso".
5. Prefiere frases como "Veo tres cosas importantes", "Lo relevante aqui es" o "Mi recomendacion operativa es".`;

const CONTEXT_PROMPTS: Record<IsaakPersonaContext, string> = {
  landing: `Contexto actual: el usuario esta descubriendo Verifactu o Isaak.
- Se breve, claro y convincente.
- Explica valor, no arquitectura.
- Invita a probar o continuar.
- No entres en tecnicismos salvo que el usuario los pida.`,
  dashboard: `Contexto actual: el usuario esta operando su negocio desde Verifactu.
- Actua como copiloto operativo.
- Prioriza beneficio, cobros, facturas pendientes, gastos y proximos pasos.
- Si detectas varias lineas posibles, priorizalas.
- Responde como alguien que ayuda a decidir hoy, no como documentacion.`,
  admin: `Contexto actual: el usuario actua como administrador u operador interno.
- Mantente claro pero algo mas estructurado.
- Puedes ser mas tecnico cuando haga falta.
- Prioriza diagnostico, estado, impacto y siguiente accion segura.`,
  holded_first: `Contexto actual: el usuario llega desde Isaak compatible con Holded.
- Centrate en valor inmediato, claridad y siguientes pasos.
- Habla de facturas, contactos, cuentas, CRM y proyectos en lenguaje claro.
- Presenta Holded como fuente de datos compatible, no como marca protagonista.
- Refuerza que Isaak explica, prioriza y ayuda a decidir, no solo lista datos.`,
};

const TONE_MODIFIERS: Record<IsaakTone, string> = {
  friendly:
    'Tono: cercano, calmado y tranquilizador. Puedes sonar humano y proximo, sin caer en relleno.',
  professional: 'Tono: claro, ejecutivo y formal, pero nunca frio ni burocratico.',
  minimal: 'Tono: directo y sobrio. Respuestas breves, densas en informacion y sin adornos.',
};

const TONE_META: Record<IsaakTone, { label: string; preview: string }> = {
  friendly: { label: 'Amigable', preview: 'Cercano, explicativo y motivador.' },
  professional: { label: 'Profesional', preview: 'Formal y claro, orientado a negocio.' },
  minimal: { label: 'Directo', preview: 'Breve, al punto y sin relleno.' },
};

const DOCK_COPY: Record<string, { greeting: string; suggestions: string[]; quickResult: string }> =
  {
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
      greeting:
        'En integraciones te propongo el orden más seguro para activar y validar conectores.',
      suggestions: ['Orden de integración', 'Checklist post-integración', 'Riesgos de conexión'],
      quickResult:
        'Activa una integración cada vez y valida datos con una muestra antes de escalar.',
    },
    isaak: {
      greeting: 'Estoy listo para ayudarte con un plan concreto en este módulo.',
      suggestions: [
        'Plan de acción de hoy',
        'Próximo paso recomendado',
        'Resumen en modo ejecutivo',
      ],
      quickResult:
        'Define objetivo del día, ejecuta 1 acción crítica y valida impacto antes del cierre.',
    },
  };

const HOLDed_ONBOARDING_COPY = {
  eyebrow: 'Compatible con Holded',
  title: 'Estas a un paso de activar tu asistente fiscal',
  intro:
    'Isaak utilizara tus datos de Holded para ayudarte a revisar informacion fiscal, anticipar impuestos y detectar errores. Esta conexion activa tu entorno real dentro del ecosistema de verifactu.business.',
  statusReady: 'Tu entorno esta listo',
  statusLoading: 'Preparando tu entorno de activacion',
  statusPending: 'Falta conectar tu ERP para activar Isaak',
  degraded:
    'No hemos podido leer el estado inicial, pero puedes continuar y activar Isaak igualmente.',
  savingMessages: [
    'Estamos validando la conexion para que Isaak trabaje con datos reales desde el primer minuto.',
    'Estamos preparando tu entorno para revisar informacion fiscal, detectar errores y priorizar tareas.',
    'Isaak esta organizando el contexto inicial para que entres con claridad y siguiente paso.',
    'En unos segundos tendras lista tu activacion dentro de verifactu.business.',
  ],
  loadingMessages: [
    'Isaak convierte datos reales de tu ERP en control fiscal y decisiones mas claras.',
    'La conexion sirve para revisar, anticipar y actuar antes de presentar.',
    'Tu activacion entra en el ecosistema de verifactu.business, no en una herramienta tecnica aislada.',
    'Compatible con Holded hoy y preparado para ampliar compatibilidad con otros ERPs.',
    'La idea es activar una solucion util, no pedirte una configuracion compleja.',
  ],
  errorApiKeyEmpty:
    'Necesitamos tu API key para validar la conexion y activar Isaak con tus datos reales.',
  errorLoadFailed: 'No se pudo preparar la activacion de Isaak',
  successConnected:
    'Tu entorno ya esta activado. Estamos terminando el acceso para llevarte al siguiente paso.',
  errorConnectFailed:
    'No hemos podido validar la conexion. Revisa tu API key e intentalo de nuevo.',
};

export function normalizeIsaakContext(value?: string | null): IsaakPersonaContext {
  if (
    value === 'landing' ||
    value === 'dashboard' ||
    value === 'admin' ||
    value === 'holded_first'
  ) {
    return value;
  }

  return 'dashboard';
}

export function normalizeIsaakTone(value?: string | null): IsaakTone {
  if (value === 'professional' || value === 'minimal') return value;
  return 'friendly';
}

export function isValidIsaakTone(value?: string | null): value is IsaakTone {
  return value === 'friendly' || value === 'professional' || value === 'minimal';
}

export function buildIsaakPersona(input?: { context?: string | null; tone?: string | null }) {
  const context = normalizeIsaakContext(input?.context);
  const tone = normalizeIsaakTone(input?.tone);

  return [
    ISAAK_IDENTITY,
    ISAAK_RESPONSE_CONTRACT,
    CONTEXT_PROMPTS[context],
    TONE_MODIFIERS[tone],
  ].join('\n\n');
}

export function getIsaakToneMeta() {
  return TONE_META;
}

export function getIsaakDockCopy(input?: {
  moduleKey?: string | null;
  context?: string | null;
  tone?: string | null;
}) {
  const moduleKey = input?.moduleKey ? String(input.moduleKey) : 'dashboard';
  const context = normalizeIsaakContext(input?.context);
  const tone = normalizeIsaakTone(input?.tone);
  const active = DOCK_COPY[moduleKey] ?? DOCK_COPY.dashboard;

  if (context === 'admin') {
    return {
      ...active,
      greeting:
        tone === 'minimal'
          ? active.greeting
          : `En admin priorizo impacto, diagnostico y siguiente accion segura. ${active.greeting}`,
    };
  }

  if (context === 'holded_first') {
    return {
      ...active,
      greeting:
        tone === 'minimal'
          ? 'Puedo traducir tus datos reales en prioridades claras.'
          : 'Puedo traducir tus datos reales en prioridades claras y siguientes pasos concretos.',
      suggestions: [
        'Qué revisar primero hoy',
        'Riesgos y pendientes clave',
        'Resumen operativo de tu actividad',
      ],
      quickResult:
        'Lo relevante aqui es convertir tus datos del ERP en foco, control y decisiones utiles, no solo en listados.',
    };
  }

  return active;
}

export function getIsaakHoldedOnboardingCopy() {
  return HOLDed_ONBOARDING_COPY;
}
