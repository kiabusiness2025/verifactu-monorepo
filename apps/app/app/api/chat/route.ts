import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: ISAAK_SYSTEM,
      messages,
      temperature: 0.7,
      maxTokens: 500,
      tools: {
        // Herramienta: Calcular beneficio
        calculateProfit: tool({
          description: 'Calcula el beneficio (ventas − gastos) de un periodo',
          parameters: z.object({
            sales: z.number().describe('Total de ventas en euros'),
            expenses: z.number().describe('Total de gastos en euros'),
            period: z.string().optional().describe('Periodo (ej: enero, Q1, etc.)'),
          }),
          execute: async ({ sales, expenses, period }) => {
            const profit = sales - expenses;
            const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0';
            return {
              profit,
              margin: parseFloat(margin),
              message: `En ${period || 'este periodo'}: has facturado ${sales}€, gastado ${expenses}€. Tu beneficio es ${profit}€ (margen del ${margin}%)`,
            };
          },
        }),

        // Herramienta: Consultar plazos VeriFactu
        checkVeriFactuDeadlines: tool({
          description: 'Consulta plazos de cumplimiento VeriFactu',
          parameters: z.object({
            month: z.number().min(1).max(12).optional().describe('Mes (1-12)'),
            year: z.number().optional().describe('Año'),
          }),
          execute: async ({ month, year }) => {
            const currentMonth = month || new Date().getMonth() + 1;
            const currentYear = year || new Date().getFullYear();
            
            // Plazos VeriFactu: envío antes del día 15 del mes siguiente
            const deadline = `15/${(currentMonth % 12) + 1}/${currentMonth === 12 ? currentYear + 1 : currentYear}`;
            
            return {
              deadline,
              message: `Para las facturas de ${getMonthName(currentMonth)}/${currentYear}, debes enviarlas a la AEAT antes del ${deadline}. Yo te aviso antes del vencimiento.`,
            };
          },
        }),

        // Herramienta: Sugerir categoría de gasto
        suggestExpenseCategory: tool({
          description: 'Sugiere la categoría fiscal adecuada para un gasto',
          parameters: z.object({
            description: z.string().describe('Descripción del gasto'),
            amount: z.number().optional().describe('Importe en euros'),
          }),
          execute: async ({ description, amount }) => {
            const lower = description.toLowerCase();
            let category = 'Otros gastos';
            let deductible = true;

            if (lower.includes('alquiler') || lower.includes('oficina')) {
              category = 'Oficina y suministros';
            } else if (lower.includes('software') || lower.includes('suscripción') || lower.includes('licencia')) {
              category = 'Software y herramientas';
            } else if (lower.includes('publicidad') || lower.includes('marketing') || lower.includes('anuncio')) {
              category = 'Marketing y publicidad';
            } else if (lower.includes('viaje') || lower.includes('gasolina') || lower.includes('hotel')) {
              category = 'Viajes y desplazamientos';
            } else if (lower.includes('asesor') || lower.includes('gestor') || lower.includes('abogado')) {
              category = 'Servicios profesionales';
            } else if (lower.includes('seguro')) {
              category = 'Seguros';
            } else if (lower.includes('impuesto') || lower.includes('tasa')) {
              category = 'Impuestos y tasas';
              deductible = false;
            }

            return {
              category,
              deductible,
              message: `"${description}" → Categoría sugerida: **${category}**${!deductible ? ' (⚠️ no deducible)' : ''}${amount ? ` | ${amount}€` : ''}`,
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
