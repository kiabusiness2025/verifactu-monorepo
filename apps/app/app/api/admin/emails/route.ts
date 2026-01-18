import { NextRequest, NextResponse } from 'next/server';

/**
 * API para gestionar correos recibidos en soporte@verifactu.business
 * Obtiene emails desde Resend API
 */

export async function GET(request: NextRequest) {
  try {
    // Verificar que es admin
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const session = request.headers.get('x-user-email'); // Simplificado para desarrollo
    
    // TODO: Implementar verificación real de sesión
    // Por ahora, permitir acceso en desarrollo
    if (process.env.NODE_ENV === 'production' && !adminEmails.includes(session || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API not configured' },
        { status: 500 }
      );
    }

    // Obtener emails desde Resend API
    // Nota: Resend no tiene endpoint directo para "inbox"
    // Esto requiere configurar un webhook y almacenar emails en DB
    
    // Por ahora, retornamos mock data para diseño del UI
    const mockEmails = [
      {
        id: '1',
        from: 'usuario@ejemplo.com',
        to: 'soporte@verifactu.business',
        subject: '¿Cómo funciona la facturación automática?',
        text: 'Hola, me gustaría saber cómo funciona el sistema de facturación automática...',
        html: '<p>Hola, me gustaría saber cómo funciona el sistema de facturación automática...</p>',
        receivedAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'pending', // pending, responded, archived
        priority: 'normal', // low, normal, high
      },
      {
        id: '2',
        from: 'empresa@empresa.com',
        to: 'soporte@verifactu.business',
        subject: 'Error al generar QR VeriFactu',
        text: 'Tengo un error al intentar generar el código QR para una factura...',
        html: '<p>Tengo un error al intentar generar el código QR para una factura...</p>',
        receivedAt: new Date(Date.now() - 7200000).toISOString(),
        status: 'pending',
        priority: 'high',
      },
      {
        id: '3',
        from: 'cliente@test.com',
        to: 'soporte@verifactu.business',
        subject: '¡Gracias por el excelente servicio!',
        text: 'Solo quería agradecer el excelente servicio que nos brindan...',
        html: '<p>Solo quería agradecer el excelente servicio que nos brindan...</p>',
        receivedAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'responded',
        priority: 'low',
      },
    ];

    return NextResponse.json({
      success: true,
      emails: mockEmails,
      total: mockEmails.length,
      pending: mockEmails.filter(e => e.status === 'pending').length,
      note: 'Mock data - Requiere configurar webhook de Resend y DB para datos reales'
    });

  } catch (error) {
    console.error('[Admin Emails API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

/**
 * Marcar email como respondido
 */
export async function PATCH(request: NextRequest) {
  try {
    const { emailId, status } = await request.json();

    if (!emailId || !status) {
      return NextResponse.json(
        { error: 'emailId and status are required' },
        { status: 400 }
      );
    }

    // TODO: Actualizar estado en base de datos
    console.log(`[Admin Emails] Marking email ${emailId} as ${status}`);

    return NextResponse.json({
      success: true,
      emailId,
      status
    });

  } catch (error) {
    console.error('[Admin Emails API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update email status' },
      { status: 500 }
    );
  }
}
