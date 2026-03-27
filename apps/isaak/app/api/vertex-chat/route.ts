import { VertexAI } from '@google-cloud/vertexai';
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

function logProvider(provider: 'vertex' | 'chatgpt' | 'fallback', messageLength: number) {
  console.info('[Isaak Public Chat] provider_selected', {
    provider,
    messageLength,
    timestamp: new Date().toISOString(),
  });
}

function extractOpenAIResponseText(payload: any): string | null {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return null;
}

async function getVertexResponse(message: string): Promise<string | null> {
  const projectId =
    process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.VERTEX_LOCATION || process.env.GCP_LOCATION || 'us-central1';

  if (!projectId) {
    return null;
  }

  try {
    const vertexAI = new VertexAI({
      project: projectId,
      location,
    });

    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_MODEL_ID || 'gemini-1.5-pro',
    });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: buildSystemPrompt() }],
        },
        {
          role: 'model',
          parts: [{ text: 'Entendido. Soy Isaak y estoy listo para ayudar.' }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (error) {
    console.error('[Isaak Public Chat] Vertex error:', error);
    return null;
  }
}

async function getChatGptResponse(message: string): Promise<string | null> {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.CLAVE_API_DE_PROYECTO_EXPERTO ||
    process.env.CLAVE_API_AI_VERCEL ||
    process.env.VERCEL_AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: buildSystemPrompt() }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: message }],
          },
        ],
        temperature: 0.5,
        max_output_tokens: 450,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[Isaak Public Chat] ChatGPT error:', response.status, errorBody);
      return null;
    }

    const payload = await response.json().catch(() => null);
    return extractOpenAIResponseText(payload);
  } catch (error) {
    console.error('[Isaak Public Chat] ChatGPT request failed:', error);
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

    const vertexText = await getVertexResponse(message);
    if (vertexText) {
      logProvider('vertex', message.length);
      return NextResponse.json({ response: vertexText });
    }

    const chatGptText = await getChatGptResponse(message);
    if (chatGptText) {
      logProvider('chatgpt', message.length);
      return NextResponse.json({ response: chatGptText });
    }

    logProvider('fallback', message.length);

    return NextResponse.json({ response: generateFallbackResponse(message) });
  } catch (error) {
    console.error('[Isaak Public Chat]', error);
    return NextResponse.json({ response: generateFallbackResponse('') });
  }
}
