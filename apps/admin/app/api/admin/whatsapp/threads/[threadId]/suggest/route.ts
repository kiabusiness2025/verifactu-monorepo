import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@verifactu/utils/ai';

export const runtime = 'nodejs';

type Params = { params: Promise<{ threadId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { threadId } = await params;

  const events = await prisma.whatsAppEvent.findMany({
    where: { threadId },
    orderBy: { occurredAt: 'desc' },
    take: 10,
    select: { direction: true, body: true, occurredAt: true },
  });

  if (events.length === 0) return NextResponse.json({ suggestions: [] });

  const history = [...events].reverse();
  const conversation = history
    .filter((e) => e.body)
    .map((e) => `${e.direction === 'inbound' ? 'Usuario' : 'Agente'}: ${e.body}`)
    .join('\n');

  const result = await callLLM({
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    feature: 'wa_suggest',
    instructions: `Eres un asistente de soporte fiscal. Basándote en la conversación de WhatsApp,
genera exactamente 3 respuestas cortas y naturales que un agente humano podría enviar al usuario.
Responde SOLO con un JSON array de strings, sin explicaciones. Ejemplo: ["Respuesta 1","Respuesta 2","Respuesta 3"]`,
    inputText: `Conversación:\n${conversation}\n\nGenera 3 sugerencias de respuesta para el agente:`,
    temperature: 0.7,
    maxOutputTokens: 300,
  });

  let suggestions: string[] = [];
  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim();
    suggestions = JSON.parse(cleaned);
    if (!Array.isArray(suggestions)) suggestions = [];
  } catch {
    suggestions = [];
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
}
