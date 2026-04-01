// Eliminado @ts-nocheck: el archivo debe compilar con tipado estricto
import {
  calculateTenantProfit,
  getCurrentMonthSummary,
  getPendingVeriFactuInvoices,
} from '@/lib/db-queries';
import { normalizeCanonicalExpense } from '@/lib/expenses/canonical';
import { classifyExpense } from '@/lib/expenses/classify';
import { holdedAdapter } from '@/lib/integrations/accounting';
import { getHoldedApiKeyForTenant } from '@/lib/integrations/holdedTenant';
import { resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { buildIsaakPersona } from '@/lib/isaak/persona';
import { buildIsaakRuntimeContext } from '@/lib/isaak/runtimeContext';
import { getCompanyProfileByNif, searchCompanies } from '@/server/einforma';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { createOpenAI } from '@ai-sdk/openai';
import { resolveOpenAIKey } from '@verifactu/utils';
import { streamText, tool, zodSchema } from 'ai';
import { z } from 'zod';

// Helpers
function getMonthName(month: number): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return months[month - 1] || 'Mes desconocido';
}

// Runtime Node.js para permitir acceso a base de datos (pg)
export const runtime = 'nodejs';

async function getResolvedTenantId(): Promise<string | null> {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) return null;
    const direct = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    if (direct.tenantId) {
      return direct.tenantId;
    }

    const fallback = await resolveTenantForOAuthSession({
      uid: session.uid,
      email: session.email ?? null,
      name: session.name ?? null,
      sessionTenantId: session.tenantId ?? null,
    });
    return fallback.tenantId;
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const session = await getSessionPayload();

    // Context puede venir del cliente (landing no necesita tenant)
    const contextType = context?.type || 'dashboard';

    let activeTenantId: string | null = null;
    if (contextType === 'dashboard' || contextType === 'admin') {
      if (!session?.uid) {
        return new Response(JSON.stringify({ error: 'No tenant found in session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      activeTenantId = await getResolvedTenantId();
    }

    if ((contextType === 'dashboard' || contextType === 'admin') && !activeTenantId) {
      return new Response(JSON.stringify({ error: 'No tenant found in session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiGatewayApiKey = process.env.CLAVE_API_AI_VERCEL || process.env.VERCEL_AI_API_KEY;
    const directOpenAIKey = resolveOpenAIKey(process.env);

    if (!aiGatewayApiKey && !directOpenAIKey) {
      return new Response(JSON.stringify({ error: 'Isaak no esta configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiClient = aiGatewayApiKey
      ? createOpenAI({
          apiKey: aiGatewayApiKey,
          baseURL: 'https://ai-gateway.vercel.sh/v1',
        })
      : createOpenAI({ apiKey: directOpenAIKey! });

    const runtimeContext = await buildIsaakRuntimeContext({
      tenantId: activeTenantId,
      userId: session?.uid ?? null,
      context: contextType,
      section: context?.section ?? null,
      conversationId: context?.conversationId ?? null,
    });

    const result = await streamText({
      model: aiClient(process.env.ISAAK_OPENAI_MODEL || 'gpt-4.1-mini'),
      system: [buildIsaakPersona({ context: contextType }), runtimeContext.systemBlock]
        .filter(Boolean)
        .join('\n\n'),
      messages,
      temperature: 0.7,
      tools: {
        calculateProfit: tool({
          description: 'Calcula el beneficio real (ventas - gastos) consultando la base de datos',
          inputSchema: zodSchema(
            z.object({
              startDate: z.string().optional(),
              endDate: z.string().optional(),
              period: z.string().optional(),
            })
          ),
          execute: async ({ startDate, endDate, period }) => {
            if (!activeTenantId)
              return {
                message: 'No hay empresa seleccionada',
                sales: 0,
                expenses: 0,
                profit: 0,
                margin: 0,
              };

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
          inputSchema: zodSchema(
            z.object({
              month: z.number().min(1).max(12).optional(),
              year: z.number().optional(),
            })
          ),
          execute: async ({ month, year }) => {
            if (!activeTenantId)
              return { deadline: '', pendingCount: 0, message: 'No hay empresa seleccionada' };

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
          inputSchema: zodSchema(
            z.object({
              description: z.string(),
              amount: z.number().optional(),
            })
          ),
          execute: async ({ description, amount }) => {
            if (!activeTenantId)
              return {
                categoryId: undefined,
                categoryName: 'N/A',
                deductible: false,
                message: 'No hay empresa seleccionada',
              };

            const matchedCategory = await classifyExpense(description);

            return {
              categoryId: matchedCategory?.id,
              categoryName: matchedCategory?.name || 'Otros gastos',
              deductible: matchedCategory?.is_deductible ?? true,
              message: `"${description}" → **${matchedCategory?.name || 'Otros gastos'}**${!matchedCategory?.is_deductible ? ' (⚠️ no deducible)' : ''}${amount ? ` | ${amount}€` : ''}`,
            };
          },
        }),

        registerExpense: tool({
          description: 'Registra un gasto validado por Isaak',
          inputSchema: zodSchema(
            z.object({
              description: z.string(),
              amount: z.number().positive(),
              date: z.string(),
              taxRate: z.number().optional(),
              reference: z.string().optional(),
              notes: z.string().optional(),
            })
          ),
          execute: async ({ description, amount, date, taxRate, reference, notes }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const matchedCategory = await classifyExpense(description);

            const categoryName = matchedCategory?.name || 'Otros gastos';
            const isDeductible = matchedCategory?.is_deductible ?? true;

            let canonical;
            try {
              canonical = normalizeCanonicalExpense({
                tenantId: activeTenantId,
                date,
                description,
                amount,
                taxRate,
                categoryId: matchedCategory?.id,
                categoryName,
                deductible: isDeductible,
                reference,
                notes,
                source: 'isaak',
              });
            } catch (error) {
              return {
                ok: false,
                message: error instanceof Error ? error.message : 'Datos de gasto inválidos',
              };
            }

            const expense = await prisma.expenseRecord.create({
              data: {
                tenantId: canonical.tenantId,
                date: new Date(canonical.date),
                description: canonical.description,
                category: canonical.categoryName || categoryName,
                amount: canonical.amount,
                taxRate: canonical.taxRate,
                reference: canonical.reference || null,
                notes:
                  [
                    canonical.notes,
                    `Deducible:${isDeductible ? 'sí' : 'no'}`,
                    `Origen:${canonical.source}`,
                  ]
                    .filter(Boolean)
                    .join(' | ') || null,
              },
            });

            return {
              ok: true,
              expenseId: expense.id,
              categoryName: canonical.categoryName || categoryName,
              deductible: isDeductible,
              message: `Gasto registrado como ${categoryName}${isDeductible ? '' : ' (no deducible)'}.`,
            };
          },
        }),

        einformaSearchCompanies: tool({
          description: 'Busca empresas en eInforma por nombre o CIF/NIF',
          inputSchema: zodSchema(
            z.object({
              query: z.string().min(3),
            })
          ),
          execute: async ({ query }) => {
            const items = await searchCompanies(query);
            return { items };
          },
        }),

        einformaGetCompanyByTaxId: tool({
          description: 'Obtiene la ficha de empresa por CIF/NIF desde eInforma',
          inputSchema: zodSchema(
            z.object({
              taxId: z.string().min(3),
            })
          ),
          execute: async ({ taxId }) => {
            const profile = await getCompanyProfileByNif(taxId);
            return { profile };
          },
        }),

        einformaEnrichTenantFromTaxId: tool({
          description: 'Enriquece el tenant activo con datos de eInforma',
          inputSchema: zodSchema(
            z.object({
              taxId: z.string().min(3),
            })
          ),
          execute: async ({ taxId }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }
            const profile = await getCompanyProfileByNif(taxId);
            const verified = !!profile.nif && profile.nif.toUpperCase() === taxId.toUpperCase();

            await prisma.tenantProfile.upsert({
              where: { tenantId: activeTenantId },
              create: {
                tenantId: activeTenantId,
                source: 'einforma',
                sourceId: profile.sourceId ?? taxId,
                cnae: profile.cnae || undefined,
                incorporationDate: profile.constitutionDate
                  ? new Date(profile.constitutionDate)
                  : undefined,
                address: profile.address?.street || undefined,
                city: profile.address?.city || undefined,
                province: profile.address?.province || undefined,
                representative: profile.representatives?.[0]?.name || undefined,
                einformaLastSyncAt: new Date(),
                einformaTaxIdVerified: verified,
                einformaRaw: profile.raw ?? undefined,
              },
              update: {
                source: 'einforma',
                sourceId: profile.sourceId ?? taxId,
                cnae: profile.cnae || undefined,
                incorporationDate: profile.constitutionDate
                  ? new Date(profile.constitutionDate)
                  : undefined,
                address: profile.address?.street || undefined,
                city: profile.address?.city || undefined,
                province: profile.address?.province || undefined,
                representative: profile.representatives?.[0]?.name || undefined,
                einformaLastSyncAt: new Date(),
                einformaTaxIdVerified: verified,
                einformaRaw: profile.raw ?? undefined,
              },
            });

            return { ok: true, profile };
          },
        }),

        holdedListInvoices: tool({
          description:
            'Lista facturas de Holded del tenant conectado para que Isaak pueda analizarlas.',
          inputSchema: zodSchema(
            z.object({
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
              status: z.string().optional(),
            })
          ),
          execute: async ({ page, limit, status }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listInvoices(integration.apiKey, {
              page: page ?? 1,
              limit: limit ?? 25,
              status,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedListContacts: tool({
          description:
            'Lista contactos de Holded del tenant conectado para preparar facturas o búsquedas.',
          inputSchema: zodSchema(
            z.object({
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
            })
          ),
          execute: async ({ page, limit }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listContacts(integration.apiKey, {
              page: page ?? 1,
              limit: limit ?? 25,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedListAccounts: tool({
          description: 'Lista cuentas contables de Holded del tenant conectado.',
          inputSchema: zodSchema(
            z.object({
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
            })
          ),
          execute: async ({ page, limit }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listAccounts(integration.apiKey, {
              page: page ?? 1,
              limit: limit ?? 25,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedListBookings: tool({
          description: 'Lista bookings y actividad CRM de Holded del tenant conectado.',
          inputSchema: zodSchema(
            z.object({
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
            })
          ),
          execute: async ({ page, limit }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listBookings(integration.apiKey, {
              page: page ?? 1,
              limit: limit ?? 25,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedListProjects: tool({
          description:
            'Lista proyectos de Holded del tenant conectado para que Isaak explique contexto operativo y rentabilidad.',
          inputSchema: zodSchema(
            z.object({
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
            })
          ),
          execute: async ({ page, limit }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listProjects(integration.apiKey, {
              page: page ?? 1,
              limit: limit ?? 25,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedGetProject: tool({
          description:
            'Obtiene un proyecto concreto de Holded por id para que Isaak pueda explicarlo o revisar su contexto.',
          inputSchema: zodSchema(
            z.object({
              projectId: z.string().min(1),
            })
          ),
          execute: async ({ projectId }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const item = await holdedAdapter.getProject(integration.apiKey, projectId);

            return {
              ok: true,
              source: 'holded',
              item,
            };
          },
        }),

        holdedListProjectTasks: tool({
          description:
            'Lista tareas de un proyecto de Holded para revisar avance operativo desde Isaak.',
          inputSchema: zodSchema(
            z.object({
              projectId: z.string().min(1),
              page: z.number().min(1).optional(),
              limit: z.number().min(1).max(100).optional(),
            })
          ),
          execute: async ({ projectId, page, limit }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            const items = await holdedAdapter.listProjectTasks(integration.apiKey, projectId, {
              page: page ?? 1,
              limit: limit ?? 25,
            });

            return {
              ok: true,
              source: 'holded',
              count: Array.isArray(items) ? items.length : 0,
              items,
            };
          },
        }),

        holdedCreateInvoiceDraft: tool({
          description:
            'Crea un borrador de factura en Holded para el tenant conectado, solo cuando el usuario lo confirma explícitamente.',
          inputSchema: zodSchema(
            z.object({
              confirm: z.boolean(),
              docType: z.string().optional(),
              payload: z.record(z.string(), z.unknown()),
            })
          ),
          execute: async ({ confirm, docType, payload }) => {
            if (!activeTenantId) {
              return { ok: false, message: 'No hay empresa seleccionada' };
            }
            if (!confirm) {
              return {
                ok: false,
                message: 'Falta confirmación explícita para crear el borrador en Holded.',
              };
            }

            const integration = await getHoldedApiKeyForTenant(activeTenantId);
            if (!integration?.apiKey) {
              return {
                ok: false,
                message: 'El tenant activo no tiene Holded conectado todavía.',
              };
            }

            if (typeof payload.contactId !== 'string' || !payload.contactId.trim()) {
              return { ok: false, message: 'payload.contactId es obligatorio.' };
            }

            if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
              return { ok: false, message: 'payload.lines debe ser un array no vacío.' };
            }

            const created = await holdedAdapter.createDocument(
              integration.apiKey,
              docType?.trim() || 'invoice',
              payload
            );

            return {
              ok: true,
              source: 'holded',
              created,
            };
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[Isaak Chat API]', error);
    return new Response('Error al procesar tu mensaje', { status: 500 });
  }
}
