import { getSessionPayload } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Configurar con tu API key de OpenAI o usar Isaak
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_ISAAK = process.env.USE_ISAAK_FOR_ADMIN === 'true';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    
    // Solo admins pueden usar el chat
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.uid }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { messages, context } = await req.json();

    // Construir contexto del sistema
    const systemContext = await buildSystemContext(session.tenantId);

    const systemPrompt = `Eres un asistente de administración para Verifactu.business.

**Contexto del sistema:**
${systemContext}

**Tu rol:**
- Ayudar al admin a verificar el estado del sistema
- Diagnosticar problemas y sugerir soluciones
- Explicar errores y logs
- Guiar en la configuración y deployment
- Proporcionar información sobre usuarios, facturas, y datos

**Capacidades:**
- Acceso a logs y métricas
- Información de base de datos (sin datos sensibles)
- Estado de deployments (Vercel, Cloud Run)
- Análisis de errores TypeScript
- Verificación de configuración

**Importante:**
- No muestres información sensible como passwords o keys
- Sé conciso y práctico
- Usa formato markdown cuando sea útil
- Sugiere comandos específicos cuando aplique`;

    let response: string;

    if (USE_ISAAK && process.env.ISAAK_API_KEY) {
      // Usar Isaak (tu asistente existente)
      response = await callIsaakAPI(systemPrompt, messages);
    } else if (OPENAI_API_KEY) {
      // Usar OpenAI
      response = await callOpenAI(systemPrompt, messages);
    } else {
      // Fallback simple
      response = generateSimpleResponse(messages[messages.length - 1].content, systemContext);
    }

    return NextResponse.json({ response });

  } catch (error) {
    console.error('Admin chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function buildSystemContext(tenantId?: string): Promise<string> {
  const stats = {
    totalUsers: 0,
    totalInvoices: 0,
    recentErrors: 0,
    deploymentStatus: 'unknown'
  };

  try {
    // Obtener estadísticas básicas
    stats.totalUsers = await prisma.user.count();
    
    if (tenantId) {
      stats.totalInvoices = await prisma.invoice.count({
        where: { tenantId }
      });
    }

    // Aquí podrías agregar más contexto como:
    // - Últimos errores de logs
    // - Estado de servicios externos
    // - Métricas de rendimiento
    
  } catch (error) {
    console.error('Error building context:', error);
  }

  return `
**Sistema:** Verifactu.business - SaaS de facturación con VeriFactu
**Usuarios totales:** ${stats.totalUsers}
**Facturas totales:** ${stats.totalInvoices}
**Entorno:** ${process.env.NODE_ENV || 'production'}
**Versión Next.js:** 14.2.35
**Base de datos:** PostgreSQL con Prisma
**Servicios:** Firebase Auth, Vercel, Cloud Run
`.trim();
}

async function callOpenAI(systemPrompt: string, messages: any[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callIsaakAPI(systemPrompt: string, messages: any[]): Promise<string> {
  // Integrar con tu API de Isaak existente
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ISAAK_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.ISAAK_ASSISTANT_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

function generateSimpleResponse(userMessage: string, context: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Respuestas simples basadas en keywords
  if (lowerMessage.includes('usuario') || lowerMessage.includes('users')) {
    return `Según el contexto actual:\n\n${context}\n\nPara más detalles, puedes usar el comando \`/check users\``;
  }

  if (lowerMessage.includes('error') || lowerMessage.includes('problema')) {
    return `Para revisar errores recientes, usa el comando \`/errors\`.\n\nTambién puedes verificar logs con \`/logs app\``;
  }

  if (lowerMessage.includes('deploy') || lowerMessage.includes('despliegue')) {
    return `Para ver el estado del deployment, usa \`/deploy status\`\n\nVercel y Cloud Run están configurados con auto-deploy desde GitHub Actions.`;
  }

  return `Entiendo tu consulta. Para ayudarte mejor, puedes:\n\n1. Usar comandos específicos (escribe /help)\n2. Hacer preguntas más específicas sobre:\n   - Estado del sistema\n   - Errores o logs\n   - Configuración\n   - Usuarios o datos\n\n${context}`;
}
