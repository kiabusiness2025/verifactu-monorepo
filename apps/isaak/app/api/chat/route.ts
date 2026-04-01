import { callOpenAIResponses, resolveOpenAIKey } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';

type RateEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateStore = new Map<string, RateEntry>();

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = rateStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateStore.set(ip, current);
  return { limited: false, retryAfterSeconds: 0 };
}

function generateFallbackResponse(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('precio') || normalized.includes('plan')) {
    return '💡 Si quieres probar sin presión, este chat abierto te orienta. Cuando necesites trabajo con datos reales, activamos la experiencia completa conectando Holded.';
  }

  if (normalized.includes('holded') || normalized.includes('erp')) {
    return '🔗 Holded es la puerta de entrada para activar contexto real. Aquí en abierto te ayudo con criterio fiscal y operativo general, y al conectar Holded pasamos a recomendaciones con tus datos.';
  }

  if (normalized.includes('verifactu') || normalized.includes('factura')) {
    return '🧾 En simple: VeriFactu busca que la facturación sea trazable y más difícil de manipular. Si quieres, te lo explico con enfoque pyme y pasos prácticos.';
  }

  if (
    normalized.includes('gastos') ||
    normalized.includes('ventas') ||
    normalized.includes('cobros') ||
    normalized.includes('caja') ||
    normalized.includes('beneficio')
  ) {
    return '📌 En este chat abierto no veo tus datos reales, pero sí puedo ayudarte con un plan claro: qué revisar primero, qué documentos preparar y qué decisiones tomar antes de cerrar el periodo.';
  }

  return '👋 Soy Isaak. Puedo ayudarte con trámites, dudas fiscales, impuestos y consejos prácticos en lenguaje claro. Cuéntame tu caso y te propongo el siguiente paso.';
}

function buildSystemPrompt() {
  return `Eres Isaak, el asistente fiscal y operativo de isaak.verifactu.business.

Objetivo:
- Ayudar a la persona usuaria con tramites, dudas fiscales, impuestos y consejos practicos.
- Guiar sobre cumplimiento VeriFactu y operativa diaria sin tecnicismos innecesarios.
- Mantener tono claro, accionable y cercano.

Identidad:
- No eres un chatbot generico de facturacion.
- Eres Isaak.
- Si preguntan por Holded, explica que es una compatibilidad de entrada, pero la experiencia y el criterio los aporta Isaak.

Estilo de respuesta:
- Espanol, breve, practico y orientado a siguiente paso.
- Evita texto legal extenso.
- Usa emojis utiles cuando ayuden a escanear la respuesta (sin exceso).
- Si falta contexto, pide solo lo minimo para avanzar.
- No hagas preguntas sobre ventas o gastos concretos de la empresa en este chat abierto.
- Si la persona pide analisis de datos reales, explica que primero debe activar la experiencia completa conectando Holded.
- No prometas acciones sobre datos reales ni acceso a informacion privada en este chat abierto.`;
}

function logProvider(provider: 'openai' | 'fallback', messageLength: number) {
  console.info('[Isaak Public Chat] provider_selected', {
    provider,
    messageLength,
    timestamp: new Date().toISOString(),
  });
}

async function getOpenAIResponse(message: string): Promise<string | null> {
  const apiKey = resolveOpenAIKey(process.env);

  if (!apiKey) {
    return null;
  }

  try {
    return await callOpenAIResponses({
      apiKey,
      model: process.env.ISAAK_OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: buildSystemPrompt(),
      inputText: message,
      temperature: 0.5,
      maxOutputTokens: 450,
    });
  } catch (error) {
    console.error('[Isaak Public Chat] OpenAI error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = isRateLimited(ip);

  if (rate.limited) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje demasiado largo.' }, { status: 400 });
    }

    const openAIText = await getOpenAIResponse(message);
    if (openAIText) {
      logProvider('openai', message.length);
      return NextResponse.json({ response: openAIText });
    }

    logProvider('fallback', message.length);

    return NextResponse.json({ response: generateFallbackResponse(message) });
  } catch (error) {
    console.error('[Isaak Public Chat]', error);
    return NextResponse.json({ response: generateFallbackResponse('') });
  }
}
