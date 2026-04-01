import { callOpenAIResponses, resolveOpenAIKey } from '@verifactu/utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';

const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'Mensaje demasiado largo'),
});

const SYSTEM_PROMPT = `Eres Isaak, el asistente fiscal y operativo de verifactu.business.

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
- Si falta contexto, pide solo lo minimo para avanzar.`;

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = await checkRateLimit({
    key: `isaak-chat:${ip}`,
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
    const apiKey = resolveOpenAIKey(process.env);

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ response: generateMockResponse(message) });
      }

      return NextResponse.json({ error: 'Servicio de chat no configurado' }, { status: 500 });
    }

    const response = await callOpenAIResponses({
      apiKey,
      model: process.env.ISAAK_OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: SYSTEM_PROMPT,
      inputText: message,
      temperature: 0.5,
      maxOutputTokens: 450,
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat:', error);

    return NextResponse.json(
      {
        response:
          'Lo siento, hubo un problema al procesar tu mensaje. Por favor, contacta con nuestro equipo en hola@verifactu.business o prueba de nuevo más tarde.',
      },
      { status: 200 }
    );
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
