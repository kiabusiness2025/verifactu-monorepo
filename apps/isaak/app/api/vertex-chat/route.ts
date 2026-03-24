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
    return 'Si quieres probar primero sin presión, empieza por el chat abierto. Cuando necesites contexto real, activamos el espacio completo y te ayudo a elegir el plan adecuado.';
  }

  if (normalized.includes('holded') || normalized.includes('erp')) {
    return 'Holded puede ser una puerta de entrada, pero Isaak pone el criterio: te ayuda a entender prioridades, revisar riesgos y aterrizar el siguiente paso con más calma.';
  }

  if (normalized.includes('verifactu') || normalized.includes('factura')) {
    return 'En simple: VeriFactu busca que la facturación sea trazable y más difícil de manipular. Si quieres, te lo explico desde el punto de vista de una pyme y no desde la norma.';
  }

  if (
    normalized.includes('gastos') ||
    normalized.includes('cobros') ||
    normalized.includes('caja')
  ) {
    return 'Cuando una empresa se atasca, casi siempre conviene separar tres capas: qué entra, qué sale y qué vence antes. Si me cuentas cuál te preocupa hoy, te ayudo a ordenarlo.';
  }

  return 'Soy Isaak. Puedo ayudarte a entender una duda fiscal u operativa con lenguaje claro y orientado al siguiente paso. Si quieres, dime tu caso en una frase.';
}

function buildSystemPrompt() {
  return `Eres Isaak, el asistente fiscal y operativo de isaak.verifactu.business.

Objetivo:
- Ayudar a la persona usuaria a entender prioridades de negocio con una narrativa simple: ventas, gastos y beneficio.
- Guiar sobre cumplimiento VeriFactu y operativa diaria sin tecnicismos innecesarios.
- Mantener tono claro, accionable y cercano.

Identidad:
- No eres un chatbot generico de facturacion.
- Eres Isaak.
- Si preguntan por Holded, explica que es una compatibilidad de entrada, pero la experiencia y el criterio los aporta Isaak.

Estilo de respuesta:
- Espanol, breve, practico y orientado a siguiente paso.
- Evita texto legal extenso.
- Si falta contexto, pide solo lo minimo para avanzar.
- No prometas acciones sobre datos reales ni acceso a informacion privada en este chat abierto.`;
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

    const projectId =
      process.env.VERTEX_PROJECT_ID ||
      process.env.GCP_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || process.env.GCP_LOCATION || 'us-central1';

    if (!projectId) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ response: generateFallbackResponse(message) });
      }

      return NextResponse.json({ error: 'Servicio de chat no configurado.' }, { status: 500 });
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

      if (text) {
        return NextResponse.json({ response: text });
      }
    } catch (error) {
      console.error('[Isaak Public Chat] Vertex error:', error);
    }

    return NextResponse.json({ response: generateFallbackResponse(message) });
  } catch (error) {
    console.error('[Isaak Public Chat]', error);
    return NextResponse.json({ response: generateFallbackResponse('') });
  }
}
