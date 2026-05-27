/**
 * POST /api/admin/isaak/export
 * Genera un archivo XLSX a partir de headers + rows enviados por IsaakDock.
 */

import { requireAdmin } from '@/lib/adminAuth';
import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    // Header row
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    // Data rows
    rows.forEach((row) => worksheet.addRow(row));

    // Auto-width columns based on content
    headers.forEach((h, i) => {
      const maxLen = Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length));
      worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    return new NextResponse(buffer as BlobPart, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
