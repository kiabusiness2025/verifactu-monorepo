/**
 * API: GET /api/admin/users/[id]
 * 
 * Obtiene ficha completa de un usuario con:
 * - Datos personales
 * - Memberships y empresas
 * - Suscripciones activas
 * - Actividad reciente
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar acceso admin
    await requireAdmin(request);

    const userId = params.id;

    // Obtener datos del usuario
    const userResult = await query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        up.preferred_tenant_id,
        up.isaak_tone,
        up.has_seen_welcome,
        up.has_completed_onboarding,
        up.updated_at as preferences_updated_at
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Obtener memberships con datos de tenants
    const membershipsResult = await query(
      `SELECT 
        m.id,
        m.tenant_id,
        m.role,
        m.status,
        m.created_at,
        t.name as tenant_name,
        t.legal_name as tenant_legal_name,
        t.nif as tenant_nif,
        t.is_demo
      FROM memberships m
      JOIN tenants t ON m.tenant_id = t.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC`,
      [userId]
    );

    const memberships = membershipsResult;

    // Obtener suscripciones de sus empresas
    const subscriptionsResult = await query(
      `SELECT 
        s.id,
        s.tenant_id,
        s.status,
        s.trial_ends_at,
        s.current_period_start,
        s.current_period_end,
        s.created_at,
        t.name as tenant_name,
        p.name as plan_name,
        p.code as plan_code,
        p.fixed_monthly
      FROM subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.tenant_id IN (
        SELECT tenant_id FROM memberships WHERE user_id = $1
      )
      ORDER BY s.created_at DESC`,
      [userId]
    );

    const subscriptions = subscriptionsResult;

    // Obtener actividad reciente (facturas creadas)
    const activityResult = await query(
      `SELECT 
        i.id,
        i.number,
        i.customer_name,
        i.amount_gross,
        i.status,
        i.created_at,
        t.name as tenant_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      WHERE i.created_by = $1
      ORDER BY i.created_at DESC
      LIMIT 10`,
      [userId]
    );

    // Contar conversaciones con Isaak
    const conversationsResult = await query(
      `SELECT COUNT(*) as count
       FROM isaak_conversations
       WHERE user_id = $1`,
      [userId]
    );

    const conversationsCount = conversationsResult[0]?.count || 0;

    return NextResponse.json({
      user,
      memberships,
      subscriptions,
      recentActivity: activityResult,
      conversationsCount
      recentActivity,
      conversationsCount
    });

  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalles del usuario', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * 
 * Actualiza datos del usuario
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const userId = params.id;
    const body = await request.json();
    const { name, email } = body;

    // Actualizar usuario
    await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email)
       WHERE id = $3`,
      [name, email, userId]
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 
 * Elimina usuario (soft delete o hard delete según configuración)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const userId = params.id;

    // TODO: Implementar lógica de eliminación
    // Considerar: eliminar de Firebase Auth también
    // Considerar: soft delete vs hard delete
    
    return NextResponse.json({ 
      success: true,
      message: 'Funcionalidad de eliminación pendiente de implementar'
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario', details: error.message },
      { status: 500 }
    );
  }
}
