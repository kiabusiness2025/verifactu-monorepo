import { NextRequest, NextResponse } from 'next/server';
import { callOpenAIResponses, resolveOpenAIKey } from '@verifactu/utils';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const OPENAI_API_KEY = resolveOpenAIKey(process.env);
const USE_ISAAK = process.env.USE_ISAAK_FOR_ADMIN === 'true';
const OPENAI_MODEL = process.env.ISAAK_OPENAI_MODEL || 'gpt-4.1-mini';

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

    if (USE_ISAAK && OPENAI_API_KEY) {
      response = await callIsaakAPI(systemPrompt, messages);
    } else if (OPENAI_API_KEY) {
      response = await callOpenAI(systemPrompt, messages);
    } else {
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
**Servicios:** Firebase Auth, Vercel, Cloud Run
`.trim();
}

async function callOpenAI(systemPrompt: string, messages: any[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI API key not configured');
  }

  return callOpenAIResponses({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    instructions: systemPrompt,
    messages: normalizeMessages(messages),
    temperature: 0.7,
    maxOutputTokens: 1000,
  });
}

async function callIsaakAPI(systemPrompt: string, messages: any[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('Isaak API key not configured');
  }

  return callOpenAIResponses({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    instructions: systemPrompt,
    messages: normalizeMessages(messages),
    temperature: 0.4,
    maxOutputTokens: 1000,
  });
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
    return `Para ver el estado del deployment, usa \`/deploy status\`\n\nVercel y Cloud Run estan configurados con auto-deploy desde GitHub Actions.`;
  }

  return `Entiendo tu consulta. Para ayudarte mejor, puedes:\n\n1. Usar comandos especificos (escribe /help)\n2. Hacer preguntas mas especificas sobre:\n   - Estado del sistema\n   - Errores o logs\n   - Configuracion\n   - Usuarios o datos\n\n${context}`;
}
