import { NextRequest, NextResponse } from 'next/server';
import { supportTicketWorkflow, type SupportTicketData } from '@/app/workflows';
import { requireAdmin } from '@/lib/adminAuth';

// Force dynamic rendering (uses cookies for admin auth)
export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/support-ticket
 * 
 * Dispara el flujo de procesamiento de ticket de soporte
 * Requiere autenticación de admin
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    await requireAdmin(request);

    const body = await request.json();
    const { ticketId, from, subject, body: ticketBody, priority } = body as SupportTicketData;

    // Validar datos
    if (!ticketId || !from || !subject || !ticketBody) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, from, subject, body' },
        { status: 400 }
      );
    }

    // Disparar workflow con prioridad (default: medium)
    const result = await supportTicketWorkflow({
      ticketId,
      from,
      subject,
      body: ticketBody,
      priority: priority || 'medium',
    });

    return NextResponse.json({
      success: result.success,
      ticketId: ticketId,
      status: result.status || 'processing',
    });
  } catch (error) {
    console.error('Error in supportTicket workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start support ticket workflow' },
      { status: 500 }
    );
  }
}
