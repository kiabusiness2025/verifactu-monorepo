import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@verifactu/utils';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const USE_ISAAK = process.env.USE_ISAAK_FOR_ADMIN === 'true';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { messages } = await req.json();

    const systemContext = await buildSystemContext();

    const systemPrompt = `Eres un asistente de administracion para Verifactu.business.

**Contexto del sistema:**
${systemContext}

**Tu rol:**
- Ayudar al admin a verificar el estado del sistema
- Diagnosticar problemas y sugerir soluciones
- Explicar errores y logs
- Guiar en la configuracion y deployment
- Proporcionar informacion sobre usuarios, facturas y datos

**Importante:**
- No muestres informacion sensible como passwords o keys
- Se conciso y practico
- Usa formato markdown cuando sea util
- Sugiere comandos especificos cuando aplique`;

    let response: string;

    try {
      const result = await callLLM({
        instructions: systemPrompt,
        messages: normalizeMessages(messages),
        temperature: USE_ISAAK ? 0.4 : 0.7,
        maxOutputTokens: 1000,
      });
      response = result.text;
    } catch {
      response = generateSimpleResponse(messages[messages.length - 1].content, systemContext);
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Admin chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildSystemContext(): Promise<string> {
  const stats = {
    totalUsers: 0,
    totalInvoices: 0,
  };

  try {
    stats.totalUsers = await prisma.user.count();
    stats.totalInvoices = await prisma.invoice.count();
  } catch (error) {
    console.error('Error building context:', error);
  }

  return `
**Sistema:** Verifactu.business - SaaS de facturacion con VeriFactu
**Usuarios totales:** ${stats.totalUsers}
**Facturas totales:** ${stats.totalInvoices}
**Entorno:** ${process.env.NODE_ENV || 'production'}
**Version Next.js:** 14.2.35
**Base de datos:** PostgreSQL con Prisma
**Servicios:** Firebase Auth, Vercel
`.trim();
}

function normalizeMessages(messages: any[]) {
  return messages
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
    )
    .map((message) => ({ role: message.role, content: message.content }));
}

function generateSimpleResponse(userMessage: string, context: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('usuario') || lowerMessage.includes('users')) {
    return `Segun el contexto actual:\n\n${context}\n\nPara mas detalles, puedes usar el comando \`/check users\``;
  }

  if (lowerMessage.includes('error') || lowerMessage.includes('problema')) {
    return `Para revisar errores recientes, usa el comando \`/errors\`.\n\nTambien puedes verificar logs con \`/logs app\``;
  }

  if (lowerMessage.includes('deploy') || lowerMessage.includes('despliegue')) {
    return `Para ver el estado del deployment, usa \`/deploy status\`\n\nEl despliegue activo se gestiona en Vercel.`;
  }

  return `Entiendo tu consulta. Para ayudarte mejor, puedes:\n\n1. Usar comandos especificos (escribe /help)\n2. Hacer preguntas mas especificas sobre:\n   - Estado del sistema\n   - Errores o logs\n   - Configuracion\n   - Usuarios o datos\n\n${context}`;
}
