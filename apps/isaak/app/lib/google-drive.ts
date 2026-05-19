import { prisma } from '@/app/lib/prisma';
import { refreshGoogleTokenIfNeeded } from '@/app/lib/gmail-scan-service';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDER_NAME = 'Isaak — Facturas';

export function hasDriveScope(scopes: string): boolean {
  return (
    scopes.includes('https://www.googleapis.com/auth/drive.file') ||
    scopes.includes('https://www.googleapis.com/auth/drive')
  );
}

async function getAccessToken(tenantId: string, userId: string): Promise<string | null> {
  const token = await prisma.isaakGoogleToken
    .findUnique({ where: { tenantId_userId: { tenantId, userId } } })
    .catch(() => null);
  if (!token) return null;

  const refreshed = await refreshGoogleTokenIfNeeded(tenantId, userId).catch(() => null);
  if (!refreshed) return null;

  const updated = await prisma.isaakGoogleToken
    .findUnique({ where: { tenantId_userId: { tenantId, userId } }, select: { accessToken: true } })
    .catch(() => null);
  return updated?.accessToken ?? null;
}

async function findOrCreateFolder(accessToken: string): Promise<string | null> {
  const q = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const listRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (listRes.ok) {
    const listData = (await listRes.json()) as { files?: Array<{ id: string }> };
    if (listData.files && listData.files.length > 0) return listData.files[0].id;
  }

  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  if (!createRes.ok) return null;
  const created = (await createRes.json()) as { id?: string };
  return created.id ?? null;
}

export async function uploadFileToDrive(
  tenantId: string,
  userId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<string | null> {
  const accessToken = await getAccessToken(tenantId, userId);
  if (!accessToken) return null;

  const token = await prisma.isaakGoogleToken
    .findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { scopes: true },
    })
    .catch(() => null);
  if (!token?.scopes || !hasDriveScope(token.scopes)) return null;

  const folderId = await findOrCreateFolder(accessToken);
  if (!folderId) return null;

  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const boundary = '-------314159265358979323846';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    fileBuffer.toString('binary'),
    `--${boundary}--`,
  ].join('\r\n');

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: Buffer.from(body, 'binary'),
    }
  );

  if (!uploadRes.ok) return null;
  const uploaded = (await uploadRes.json()) as { id?: string; webViewLink?: string };
  return uploaded.webViewLink ?? uploaded.id ?? null;
}

export async function uploadInvoiceToDrive(
  tenantId: string,
  userId: string,
  fileName: string,
  pdfBuffer: Buffer
): Promise<string | null> {
  return uploadFileToDrive(tenantId, userId, fileName, pdfBuffer, 'application/pdf');
}
