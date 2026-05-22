import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@verifactu/utils';

export const runtime = 'nodejs';

type RateRecord = { count: number; resetAt: number };
const rateStore = new Map<string, RateRecord>();
const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

function getIp(req: NextRequest) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const rec = rateStore.get(ip);
  if (!rec || rec.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (rec.count >= LIMIT) return true;
  rec.count += 1;
  return false;
}

const SYSTEM_PROMPT = `Eres el asistente de ventas de Isaak (isaak.verifactu.business), la plataforma de IA empresarial de Verifactu Business. Tu misión es orientar a visitantes sobre planes, precios y cómo empezar. Responde en español, de forma directa y amigable. Máximo 3-4 frases por respuesta.

PLANES DISPONIBLES (precios sin IVA):

1. Starter — 19 €/mes
   - 1 ERP conectado (Holded u otro vía Chift)
   - 100 consultas/mes a Isaak
   - Dashboard de ventas y gastos
   - Cumplimiento VeriFactu incluido

2. Pyme — 49 €/mes
   - Consultas ilimitadas a Isaak
   - Google integrations (Gmail, Calendar, Drive)
   - Subida de documentos y facturas
   - Informes y análisis avanzados

3. Empresa — 149 €/mes
   - Hasta 3 ERPs conectados simultáneamente
   - Multi-usuario (hasta 5 usuarios)
   - Alertas fiscales y modelos AEAT
   - Acceso API + webhooks

Todos los planes incluyen prueba gratuita de 14 días sin tarjeta.

QUÉ ES ISAAK:
Isaak es una capa de IA conversacional que se conecta a tu ERP (Holded, Sage, A3ERP, Odoo, Xero y +40 más vía Chift), banca, correo y documentos. Permite hacer preguntas en español y obtener respuestas con datos reales de tu empresa. No es otro ERP — conecta los que ya usas.

CARACTERÍSTICAS CLAVE:
- Cumplimiento VeriFactu: AEAT, trazabilidad y Ley Antifraude
- ERP conectado: Holded directo + 40+ ERPs vía Chift
- Open Banking: movimientos bancarios en tiempo real (próximamente)
- Chat 24/7: pregunta por ventas, gastos, facturas, cobros, proveedores

PROCESO DE CONTRATACIÓN:
1. Crear cuenta gratuita en isaak.verifactu.business (sin tarjeta)
2. Conectar el ERP desde Ajustes → Conexiones
3. Empezar a usar Isaak inmediatamente
4. Actualizar plan si se superan los límites del gratuito

LIMITACIONES:
- No tienes acceso a datos de empresa específica
- Para soporte técnico, dirigir a soporte@verifactu.business
- Cuando el usuario quiera registrarse: https://isaak.verifactu.business/auth`;

type HistoryItem = { role: 'user' | 'assistant'; content: string };

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  if (checkRate(ip)) {
    return NextResponse.json(
      {
        error:
          'Has alcanzado el límite de consultas. Crea una cuenta gratuita para continuar sin límites.',
        cta: 'https://isaak.verifactu.business',
      },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Escribe tu consulta para continuar.' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });
  }

  const rawHistory: unknown = body?.history;
  const history: HistoryItem[] = Array.isArray(rawHistory)
    ? (rawHistory.slice(-6) as unknown[]).filter((m): m is HistoryItem => {
        if (typeof m !== 'object' || m === null) return false;
        const item = m as Record<string, unknown>;
        return (
          (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
        );
      })
    : [];

  try {
    const result = await callLLM({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      instructions: SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: message }],
      maxOutputTokens: 512,
      enableFallback: false,
    });

    return NextResponse.json({ ok: true, reply: result.text });
  } catch {
    return NextResponse.json(
      { error: 'Servicio no disponible ahora. Escríbenos a soporte@verifactu.business.' },
      { status: 503 }
    );
  }
}
