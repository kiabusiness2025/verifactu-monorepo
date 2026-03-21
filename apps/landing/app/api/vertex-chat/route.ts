import { VertexAI } from '@google-cloud/vertexai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';

const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'Mensaje demasiado largo'),
});

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = await checkRateLimit({
    key: `vertex-chat:${ip}`,
    limit: 20,
    windowSeconds: 60,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();

    const validationResult = chatSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { message } = validationResult.data;

    const projectId =
      process.env.VERTEX_PROJECT_ID ||
      process.env.GCP_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || process.env.GCP_LOCATION || 'us-central1';

    if (!projectId) {
      console.error('VERTEX_PROJECT_ID (or GCP_PROJECT_ID) not configured');
      if (process.env.NODE_ENV === 'development') {
        const mockResponse = generateMockResponse(message);
        return NextResponse.json({ response: mockResponse });
      }
      return NextResponse.json({ error: 'Servicio de chat no configurado' }, { status: 500 });
    }

    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_MODEL_ID || 'gemini-1.5-pro',
    });

    const systemPrompt = `Eres Isaak, el asistente fiscal y operativo de verifactu.business.

  Objetivo:
  - Ayudar a la persona usuaria a entender prioridades de negocio con una narrativa simple: ventas, gastos y beneficio.
  - Guiar sobre cumplimiento VeriFactu y operativa diaria sin tecnicismos innecesarios.
  - Mantener tono claro, accionable y cercano.

  Flujo canonico que debes respetar:
  - Al crear cuenta, el usuario entra en Empresa Demo SL.
  - Demo SL no caduca.
  - Cuando quiera operar con datos reales, activa una prueba real de 30 dias.
  - La prueba real permite crear 1 empresa real.

  Identidad:
  - No eres un chatbot generico de facturacion.
  - Eres Isaak by verifactu.business.
  - Si preguntan por Holded, explica que es una compatibilidad de entrada, pero la experiencia y criterio los aporta Isaak.

  Estilo de respuesta:
  - Espanol, breve, practico y orientado a siguiente paso.
  - Evita texto legal extenso.
  - Si falta contexto, pide solo lo minimo para avanzar.
  `;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Entendido. Soy Isaak y estoy listo para ayudarte.' }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, no pude generar una respuesta.';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Error in vertex-chat:', error);

    const fallbackResponse =
      'Lo siento, hubo un problema al procesar tu mensaje. ' +
      'Por favor, contacta con nuestro equipo en hola@verifactu.business o prueba de nuevo más tarde.';

    return NextResponse.json({ response: fallbackResponse });
  }
}

function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('precio') ||
    lowerMessage.includes('costo') ||
    lowerMessage.includes('cuánto')
  ) {
    return (
      'Te recomiendo empezar por el flujo real: entras en Demo SL sin caducidad y validas proceso. ' +
      'Cuando quieras operar en real, activas la prueba real de 30 días con 1 empresa. ' +
      'Si quieres, te ayudo a elegir plan según volumen y equipo.'
    );
  }

  if (lowerMessage.includes('funciona') || lowerMessage.includes('cómo')) {
    return (
      'En simple: 1) entras en Demo SL, 2) ordenas flujo con ayuda de Isaak, 3) pasas a real cuando te convenga. ' +
      'Isaak te va marcando el siguiente paso para cumplir VeriFactu sin fricción.'
    );
  }

  if (lowerMessage.includes('integración') || lowerMessage.includes('erp')) {
    return (
      'Holded es una compatibilidad de entrada, pero la capa de criterio y acompañamiento es Isaak. ' +
      'La idea es que no dependas de una integración concreta para tener claridad operativa y fiscal.'
    );
  }

  if (lowerMessage.includes('sii') || lowerMessage.includes('suministro')) {
    return (
      'El SII (Suministro Inmediato de Información) es el sistema de la Agencia Tributaria ' +
      'para el control de facturas. Verifactu automatiza completamente el envío de libros de ' +
      'facturas al SII, asegurando el cumplimiento normativo sin errores.'
    );
  }

  if (lowerMessage.includes('demo') || lowerMessage.includes('prueba')) {
    return (
      'Perfecto. Empieza entrando en Demo SL y prueba flujo completo sin caducidad. ' +
      'Cuando quieras trabajar con datos reales, activas la prueba real de 30 días con 1 empresa.'
    );
  }

  return (
    'Soy Isaak. Te ayudo a priorizar ventas, gastos y beneficio y a mantener VeriFactu bajo control. ' +
    'Si quieres, empezamos por tu caso y te digo el siguiente paso más útil hoy.'
  );
}
