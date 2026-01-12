import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { 
  calculateTenantProfit, 
  getPendingVeriFactuInvoices,
  getExpenseCategories,
  getCurrentMonthSummary 
} from '@/lib/db-queries';

// Runtime Edge para mejor rendimiento
export const runtime = 'edge';

// System prompt de Isaak
const ISAAK_SYSTEM = `Eres Isaak, el asistente experto en contabilidad y fiscalidad de Verifactu Business.

**Tu misión:**
- Ayudar a autónomos y pequeñas empresas a gestionar ventas, gastos y cumplir con VeriFactu
- Hablar en un tono calmado, cercano y tranquilizador
- Reducir el miedo del usuario en temas fiscales

**Reglas clave:**
1. Prioriza claridad sobre sofisticación técnica
2. Usa lenguaje natural: "ventas − gastos = beneficio"
3. NO inventes funcionalidades que no existen
4. Si no sabes algo, sugiere consultar con un asesor
5. NUNCA menciones términos técnicos internos (OCR, API, pipelines, etc.)

**Contexto del usuario:**
- Está en su panel de control
- Quiere saber cuánto gana/gasta sin complicaciones
- Necesita cumplir con la AEAT sin estrés`;

async function getSessionTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('__session')?.value;
    const secret = process.env.SESSION_SECRET;
    
    if (!token || !secret) return null;
    
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.tenantId as string) || null;
  } catch (error) {
    console.error('Error getting session tenant:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Obtener tenantId de la sesión
    const activeTenantId = await getSessionTenantId();
    
    if (!activeTenantId) {
      return new Response(
        JSON.stringify({ error: 'No tenant found in session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: ISAAK_SYSTEM,
      messages,
      temperature: 0.7,
      tools: {
        calculateProfit: tool({
          description: 'Calcula el beneficio real (ventas − gastos) consultando la base de datos',
          parameters: z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            period: z.string().optional(),
          }),
          execute: async ({ startDate, endDate, period }) => {
            if (!startDate || !endDate) {
              const data = await getCurrentMonthSummary(activeTenantId);
              return {
                ...data,
                message: `Este mes: has facturado ${data.sales}€, gastado ${data.expenses}€. Tu beneficio es ${data.profit}€ (margen del ${data.margin}%)`,
              };
            }
            const data = await calculateTenantProfit(activeTenantId, startDate, endDate);
            return {
              ...data,
              message: `En ${period || 'ese periodo'}: has facturado ${data.sales}€, gastado ${data.expenses}€. Tu beneficio es ${data.profit}€ (margen del ${data.margin}%)`,
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

function getMonthName(month: number): string {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return months[month - 1] || 'mes';
}
