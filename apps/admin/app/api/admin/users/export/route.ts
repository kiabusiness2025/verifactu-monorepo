/**
 * API: GET /api/admin/users/export
 *
 * Exporta listado de usuarios a CSV (compatible con Excel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { formatShortDate } from '@/src/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar acceso admin
    await requireAdmin(request);

    // Obtener todos los usuarios con sus memberships
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        up.isaak_tone,
        up.has_seen_welcome,
        up.has_completed_onboarding,
        STRING_AGG(t.name, '; ') as empresas,
        STRING_AGG(m.role, '; ') as roles,
        COUNT(DISTINCT m.tenant_id) as num_empresas
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN tenants t ON m.tenant_id = t.id
      GROUP BY u.id, u.email, u.name, u.created_at, up.isaak_tone, up.has_seen_welcome, up.has_completed_onboarding
      ORDER BY u.created_at DESC`
    );

    // Generar CSV
    const headers = [
      'ID',
      'Email',
      'Nombre',
      'Fecha Registro',
      'Num Empresas',
      'Empresas',
      'Roles',
      'Tono Isaak',
      'Onboarding Completado',
    ];

    const rows: any[] = result.map((user: any) => [
      user.id,
      user.email,
      user.name || '',
      formatShortDate(user.created_at),
      user.num_empresas || 0,
      user.empresas || '',
      user.roles || '',
      user.isaak_tone || 'friendly',
      user.has_completed_onboarding ? 'Sí' : 'No',
    ]);

    // Construir CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    // Añadir BOM para que Excel detecte UTF-8
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="usuarios-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Error al exportar usuarios', details: error.message },
      { status: 500 }
    );
  }
}
