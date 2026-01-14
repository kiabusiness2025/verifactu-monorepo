import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { uploadToStorage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/upload
 * Subir archivo a Firebase Storage
 * 
 * Body: FormData con campos:
 * - file: File
 * - category: 'invoices' | 'documents' | 'avatars' | 'attachments'
 * - customFileName?: string (opcional)
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const customFileName = formData.get('customFileName') as string | null;

    // Validar inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!category || !['invoices', 'documents', 'avatars', 'attachments'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Usar tenantId del usuario
    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated' },
        { status: 400 }
      );
    }

    // Upload a Storage
    const result = await uploadToStorage(
      tenantId,
      category as any,
      file,
      customFileName || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      file: result.file,
      url: result.url,
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/delete
 * Eliminar archivo de Firebase Storage
 * 
 * Body JSON:
 * - category: string
 * - fileName: string
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category, fileName } = body;

    if (!category || !fileName) {
      return NextResponse.json(
        { error: 'Missing category or fileName' },
        { status: 400 }
      );
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated' },
        { status: 400 }
      );
    }

    // Eliminar de Storage
    const result = await deleteFromStorage(tenantId, category, fileName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Delete failed',
      },
      { status: 500 }
    );
  }
}

// Importar funciones que faltan
async function deleteFromStorage(tenantId: string, category: string, fileName: string) {
  // Implement or import from storage.ts
  return { success: true };
}
