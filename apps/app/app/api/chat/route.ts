// Eliminado @ts-nocheck: el archivo debe compilar con tipado estricto
import {
    calculateTenantProfit,
    getCurrentMonthSummary,
    getExpenseCategories,
    getPendingVeriFactuInvoices
} from '@/lib/db-queries';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { readSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from '@verifactu/utils';
import { streamText, tool } from 'ai';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Helpers
function getMonthName(month: number): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[month - 1] || 'Mes desconocido';
}

// Runtime Node.js para permitir acceso a base de datos (pg)
export const runtime = 'nodejs';

// System prompts contextuales para Isaak
const ISAAK_SYSTEM_BASE = `Eres Isaak, el asistente experto en contabilidad y fiscalidad de Verifactu Business.

**Tu misión:**
- Ayudar a autónomos y pequeñas empresas a gestionar ventas, gastos y cumplir con VeriFactu
- Hablar en un tono calmado, cercano y tranquilizador
- Reducir el miedo del usuario en temas fiscales

**Reglas clave:**
1. Prioriza claridad sobre sofisticación técnica
2. Usa lenguaje natural: "ventas - gastos = beneficio"
3. NO inventes funcionalidades que no existen
4. Si no sabes algo, sugiere consultar con un asesor
5. NUNCA menciones términos técnicos internos (OCR, API, pipelines, etc.)`;

const ISAAK_CONTEXT_PROMPTS = {
  landing: `Tu contexto: El usuario está visitando nuestra landing page.
- Sé breve y cautivador
- Menciona el valor principal: simplificar impuestos y VeriFactu
- No hagas preguntas técnicas
- Invita a probar o conocer más`,

  dashboard: `Tu contexto: El usuario está en su panel de control.
- Ayuda con preguntas específicas sobre sus facturas, gastos y beneficio
- Sé práctico: "Tu beneficio este mes es X"
- Sugiere acciones: "¿Quieres subir un gasto?" o "¿Revisamos tus facturas pendientes?"
- Sé su copiloto, no un chatbot genérico`,

  admin: `Tu contexto: El usuario es un administrador del sistema.
- Proporciona información técnica y operativa cuando sea necesario
- Ayuda con reportes, importación de datos, gestión de empresas
- Sé más formal pero igualmente cercano
- Oferece análisis de negocio y datos consolidados`,
};

function buildIsaakSystem(context?: string): string {
  const contextPrompt =
    context && context in ISAAK_CONTEXT_PROMPTS
      ? ISAAK_CONTEXT_PROMPTS[context as keyof typeof ISAAK_CONTEXT_PROMPTS]
      : ISAAK_CONTEXT_PROMPTS.dashboard;

  return `${ISAAK_SYSTEM_BASE}\n\n${contextPrompt}`;
}

async function getSessionTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return payload?.tenantId || null;
  } catch (error) {
    console.error('Error getting session tenant:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    
    // Obtener tenantId de la sesión
    const activeTenantId = await getSessionTenantId();
    
    // Context puede venir del cliente (landing no necesita tenant)
    const contextType = context?.type || 'dashboard';
    
    if (contextType === 'dashboard' && !activeTenantId) {
      return new Response(
        JSON.stringify({ error: 'No tenant found in session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Usar AI Gateway de Vercel en lugar de OpenAI directo
    const aiGatewayApiKey = process.env.CLAVE_API_AI_VERCEL || process.env.VERCEL_AI_API_KEY;
    
    if (!aiGatewayApiKey) {
      console.warn('[Isaak Chat API] AI Gateway key not found, falling back to OpenAI direct');
    }

    // Crear cliente de OpenAI apuntando a AI Gateway
    const aiGatewayClient = aiGatewayApiKey
      ? createOpenAI({
          apiKey: aiGatewayApiKey,
          baseURL: 'https://ai-gateway.vercel.sh/v1',
        })
      : openai;

    const result = await streamText({
      model: aiGatewayClient('gpt-4-turbo'),
      system: buildIsaakSystem(contextType),
      messages,
      temperature: 0.7,
      tools: {
        calculateProfit: tool({
          description: 'Calcula el beneficio real (ventas - gastos) consultando la base de datos',
          parameters: z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            period: z.string().optional(),
          }),
          execute: async ({ startDate, endDate, period }) => {
            if (!activeTenantId) return { message: 'No hay empresa seleccionada', sales: 0, expenses: 0, profit: 0, margin: 0 };
            
            if (!startDate || !endDate) {
              const data = await getCurrentMonthSummary(activeTenantId);
              return {
                sales: data.sales,
                expenses: data.expenses,
                profit: data.profit,
                margin: data.margin,
                message: `Este mes: has facturado ${data.sales}€, gastado ${data.expenses}€. Tu beneficio es ${data.profit}€ (margen del ${data.margin}%)`,
              };
            }
            const data = await calculateTenantProfit(activeTenantId, startDate, endDate);
            return {
              sales: data.sales,
              expenses: data.expenses,
              profit: data.profit,
              margin: data.margin,
              message: `En ${period || 'ese período'}: has facturado ${data.sales}€, gastado ${data.expenses}€. Tu beneficio es ${data.profit}€ (margen del ${data.margin}%)`,
            };
          },
        }),

        checkVeriFactuDeadlines: tool({
          description: 'Consulta plazos VeriFactu y facturas pendientes de enviar',
          parameters: z.object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
          }),
          execute: async ({ month, year }) => {
            if (!activeTenantId) return { deadline: '', pendingCount: 0, message: 'No hay empresa seleccionada' };
            
            const currentMonth = month || new Date().getMonth() + 1;
            const currentYear = year || new Date().getFullYear();
            const pending = await getPendingVeriFactuInvoices(activeTenantId);
            const deadline = `15/${(currentMonth % 12) + 1}/${currentMonth === 12 ? currentYear + 1 : currentYear}`;
            
            let message = `Para las facturas de ${getMonthName(currentMonth)}/${currentYear}, debes enviarlas a la AEAT antes del ${deadline}.`;
            
            if (pending.length > 0) {
              message += ` Tienes ${pending.length} factura(s) pendiente(s) de enviar:\n`;
              pending.slice(0, 3).forEach((inv: any) => {
                message += `• ${inv.number} (${inv.issue_date}): ${inv.total}€\n`;
              });
              if (pending.length > 3) message += `...y ${pending.length - 3} más.`;
            } else {
              message += ` ¡Todo al día! No tienes facturas pendientes.`;
            }
            
            return { deadline, pendingCount: pending.length, message };
          },
        }),

        suggestExpenseCategory: tool({
          description: 'Sugiere la categoría fiscal adecuada para un gasto',
          parameters: z.object({
            description: z.string(),
            amount: z.number().optional(),
          }),
          execute: async ({ description, amount }) => {
            if (!activeTenantId) return { categoryId: undefined, categoryName: 'N/A', deductible: false, message: 'No hay empresa seleccionada' };
            
            const categories = await getExpenseCategories();
            const lower = description.toLowerCase();
            let matchedCategory = categories.find(cat => cat.code === 'other');
            
            if (lower.includes('alquiler') || lower.includes('oficina')) {
              matchedCategory = categories.find(cat => cat.code === 'office');
            } else if (lower.includes('software') || lower.includes('suscripción') || lower.includes('licencia')) {
              matchedCategory = categories.find(cat => cat.code === 'software');
            } else if (lower.includes('publicidad') || lower.includes('marketing')) {
              matchedCategory = categories.find(cat => cat.code === 'marketing');
            } else if (lower.includes('viaje') || lower.includes('gasolina') || lower.includes('hotel')) {
              matchedCategory = categories.find(cat => cat.code === 'travel');
            } else if (lower.includes('asesor') || lower.includes('gestor') || lower.includes('abogado')) {
              matchedCategory = categories.find(cat => cat.code === 'professional');
            } else if (lower.includes('seguro')) {
              matchedCategory = categories.find(cat => cat.code === 'insurance');
            } else if (lower.includes('impuesto') || lower.includes('tasa')) {
              matchedCategory = categories.find(cat => cat.code === 'taxes');
            } else if (lower.includes('banco') || lower.includes('comisión')) {
              matchedCategory = categories.find(cat => cat.code === 'banking');
            } else if (lower.includes('formación') || lower.includes('curso')) {
              matchedCategory = categories.find(cat => cat.code === 'training');
            }


            return {
              categoryId: matchedCategory?.id,
              categoryName: matchedCategory?.name || 'Otros gastos',
              deductible: matchedCategory?.is_deductible ?? true,
              message: `"${description}" → **${matchedCategory?.name || 'Otros gastos'}**${!matchedCategory?.is_deductible ? ' (⚠️ no deducible)' : ''}${amount ? ` | ${amount}€` : ''}`,
            };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[Isaak Chat API]', error);
    return new Response('Error al procesar tu mensaje', { status: 500 });
  }
}


