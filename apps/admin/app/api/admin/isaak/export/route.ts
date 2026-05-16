/**
 * POST /api/admin/isaak/export
 * Genera un archivo XLSX a partir de headers + rows enviados por IsaakDock.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body = (await req.json()) as {
      filename?: string;
      headers?: string[];
      rows?: unknown[][];
    };

    const { filename = 'isaak-export', headers = [], rows = [] } = body;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-width columns based on content
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    const raw = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const blob = new Blob([raw as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    return new NextResponse(blob, {
      headers: {
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/export]', error);
    return NextResponse.json({ error: 'Error generando Excel' }, { status: 500 });
  }
}
