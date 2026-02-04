import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { uploadToStorage } from '@/lib/storage';
import prisma from '@/lib/prisma';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

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
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

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
    const tenantId = resolved.tenantId;
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

    try {
      let actorUserId = session.uid;
      let impersonatedUserId: string | null = null;
      let supportSessionId: string | null = null;

      if (resolved.supportMode && resolved.supportSessionId) {
        const supportSession = await prisma.supportSession.findUnique({
          where: { id: resolved.supportSessionId },
          select: { adminId: true, userId: true },
        });
        if (supportSession) {
          actorUserId = supportSession.adminId;
          impersonatedUserId = supportSession.userId;
          supportSessionId = resolved.supportSessionId;
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId,
          action: "COMPANY_VIEW",
          metadata: {
            action: "STORAGE.UPLOAD",
            tenantId,
            category,
            fileName: result.file?.name ?? null,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
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
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    const body = await req.json();
    const { category, fileName } = body;

    if (!category || !fileName) {
      return NextResponse.json(
        { error: 'Missing category or fileName' },
        { status: 400 }
      );
    }

    const tenantId = resolved.tenantId;
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
        { error: (result as { success: false; error: string }).error },
        { status: 400 }
      );
    }

    try {
      let actorUserId = session.uid;
      let impersonatedUserId: string | null = null;
      let supportSessionId: string | null = null;

      if (resolved.supportMode && resolved.supportSessionId) {
        const supportSession = await prisma.supportSession.findUnique({
          where: { id: resolved.supportSessionId },
          select: { adminId: true, userId: true },
        });
        if (supportSession) {
          actorUserId = supportSession.adminId;
          impersonatedUserId = supportSession.userId;
          supportSessionId = resolved.supportSessionId;
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId,
          action: "COMPANY_VIEW",
          metadata: {
            action: "STORAGE.DELETE",
            tenantId,
            category,
            fileName,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
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
