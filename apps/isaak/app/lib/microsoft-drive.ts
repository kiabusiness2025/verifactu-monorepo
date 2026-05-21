import { getValidMicrosoftToken } from './microsoft-oauth';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const FOLDER_NAME = 'Isaak — Facturas';

export type OneDriveFile = {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  webUrl?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
};

async function findOrCreateFolder(accessToken: string): Promise<string | null> {
  const searchRes = await fetch(
    `${GRAPH_API}/me/drive/root/children?$filter=name eq '${FOLDER_NAME}' and folder ne null&$select=id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const data = (await searchRes.json()) as { value?: Array<{ id: string }> };
    if (data.value && data.value.length > 0) return data.value[0].id;
  }

  const createRes = await fetch(`${GRAPH_API}/me/drive/root/children`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    }),
  });
  if (!createRes.ok) return null;
  const created = (await createRes.json()) as { id?: string };
  return created.id ?? null;
}

export async function listOneDriveFiles(
  tenantId: string,
  userId: string,
  options: { maxResults?: number } = {}
): Promise<OneDriveFile[]> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return [];

  const folderId = await findOrCreateFolder(accessToken);
  if (!folderId) return [];

  const params = new URLSearchParams({
    $top: String(options.maxResults ?? 20),
    $orderby: 'lastModifiedDateTime desc',
    $select: 'id,name,size,lastModifiedDateTime,webUrl,file,folder',
  });

  const res = await fetch(`${GRAPH_API}/me/drive/items/${folderId}/children?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { value?: OneDriveFile[] };
  return data.value ?? [];
}

export async function uploadFileToOneDrive(
  tenantId: string,
  userId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<string | null> {
  const accessToken = await getValidMicrosoftToken(tenantId, userId);
  if (!accessToken) return null;

  const folderId = await findOrCreateFolder(accessToken);
  if (!folderId) return null;

  const uploadRes = await fetch(
    `${GRAPH_API}/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer.buffer as ArrayBuffer,
    }
  );

  if (!uploadRes.ok) return null;
  const uploaded = (await uploadRes.json()) as { id?: string; webUrl?: string };
  return uploaded.webUrl ?? uploaded.id ?? null;
}

export async function uploadInvoiceToOneDrive(
  tenantId: string,
  userId: string,
  fileName: string,
  pdfBuffer: Buffer
): Promise<string | null> {
  return uploadFileToOneDrive(tenantId, userId, fileName, pdfBuffer, 'application/pdf');
}
