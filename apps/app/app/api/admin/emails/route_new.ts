import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * API para gestionar correos recibidos en soporte@verifactu.business
 * Lee emails desde PostgreSQL (poblados por webhook de Resend)
 */

interface EmailRow {
  id: string;
  message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  text_content: string | null;
  html_content: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'responded' | 'archived' | 'spam';
  received_at: Date;
}

/**
 * GET - Obtener lista de emails con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir query con filtros
    let whereConditions = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (statusFilter && statusFilter !== 'all') {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(statusFilter);
      paramIndex++;
    }

    if (priorityFilter && priorityFilter !== 'all') {
      whereConditions.push(`priority = $${paramIndex}`);
      params.push(priorityFilter);
      paramIndex++;
    }

    // Query principal
    const emailsQuery = `
      SELECT 
        id, message_id, from_email, from_name, to_email, subject,
        text_content, html_content, priority, status, received_at
      FROM admin_emails
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY received_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const emails = await query<EmailRow>(emailsQuery, params);

    // Stats query
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'responded') as responded,
        COUNT(*) FILTER (WHERE status = 'archived') as archived,
        COUNT(*) FILTER (WHERE status = 'spam') as spam
      FROM admin_emails
    `;
    const stats = await query<any>(statsQuery);

    // Formatear respuesta
    const formattedEmails = emails.map(email => ({
      id: email.id,
      from: email.from_name 
        ? `${email.from_name} <${email.from_email}>` 
        : email.from_email,
      to: email.to_email,
      subject: email.subject,
      text: email.text_content || '',
      html: email.html_content || '',
      receivedAt: email.received_at.toISOString(),
      status: email.status,
      priority: email.priority,
    }));

    return NextResponse.json({
      emails: formattedEmails,
      total: parseInt(stats[0]?.total || '0'),
      pending: parseInt(stats[0]?.pending || '0'),
      responded: parseInt(stats[0]?.responded || '0'),
      archived: parseInt(stats[0]?.archived || '0'),
      spam: parseInt(stats[0]?.spam || '0'),
      pagination: {
        limit,
        offset,
        hasMore: emails.length === limit,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar estado de un email
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailId, status, respondedBy } = body;

    if (!emailId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: emailId, status' },
        { status: 400 }
      );
    }

    // Validar status
    const validStatuses = ['pending', 'responded', 'archived', 'spam'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Preparar campos adicionales según el status
    let additionalFields = '';
    const params: any[] = [status, emailId];
    
    if (status === 'responded') {
      additionalFields = ', responded_at = NOW()';
      if (respondedBy) {
        additionalFields += ', responded_by = $3';
        params.splice(2, 0, respondedBy);
      }
    } else if (status === 'archived') {
      additionalFields = ', archived_at = NOW()';
    }

    // Actualizar en BD
    const updateQuery = `
      UPDATE admin_emails
      SET status = $1${additionalFields}
      WHERE id = $${params.length}
      RETURNING id, status, responded_at, archived_at
    `;

    const result = await query(updateQuery, params);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result[0],
    });
  } catch (error) {
    console.error('[API] Error updating email:', error);
    return NextResponse.json(
      { error: 'Failed to update email', details: String(error) },
      { status: 500 }
    );
  }
}
