/**
 * Firebase Storage Integration
 * Maneja uploads de documentos por tenant
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase';

// Ensure Firebase is initialized
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export interface StorageFile {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
  contentType: string;
}

export interface UploadResult {
  success: boolean;
  file?: StorageFile;
  error?: string;
  url?: string;
}

/**
 * Upload un archivo a Firebase Storage
 * Estructura: /tenants/{tenantId}/{category}/{fileName}
 */
export async function uploadToStorage(
  tenantId: string,
  category: 'invoices' | 'documents' | 'avatars' | 'attachments',
  file: File,
  customFileName?: string
): Promise<UploadResult> {
  try {
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required',
      };
    }

    // Validar tamaño (máx 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Archivo demasiado grande (máx 50MB)',
      };
    }

    // Crear nombre único
    const timestamp = Date.now();
    const fileName = customFileName || `${timestamp}-${file.name}`;
    const storagePath = `tenants/${tenantId}/${category}/${fileName}`;

    // Crear referencia y upload
    const fileRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        tenantId,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Obtener URL descargable
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      file: {
        name: file.name,
        url: downloadUrl,
        size: file.size,
        uploadedAt: new Date(),
        contentType: file.type,
      },
      url: downloadUrl,
    };
  } catch (error) {
    console.error('[STORAGE] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Obtener URL descargable de un archivo existente
 */
export async function getStorageUrl(
  tenantId: string,
  category: string,
  fileName: string
): Promise<string | null> {
  try {
    const fileRef = ref(storage, `tenants/${tenantId}/${category}/${fileName}`);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('[STORAGE] Get URL failed:', error);
    return null;
  }
}

/**
 * Eliminar un archivo de Storage
 */
export async function deleteFromStorage(
  tenantId: string,
  category: string,
  fileName: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const fileRef = ref(storage, `tenants/${tenantId}/${category}/${fileName}`);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('[STORAGE] Delete failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Subir avatar de usuario
 */
export async function uploadAvatar(
  tenantId: string,
  userId: string,
  file: File
): Promise<UploadResult> {
  const fileName = `${userId}-${Date.now()}`;
  return uploadToStorage(tenantId, 'avatars', file, fileName);
}

/**
 * Subir factura (validación extra)
 */
export async function uploadInvoice(
  tenantId: string,
  file: File
): Promise<UploadResult> {
  // Solo PDFs, XML, o JSON para facturas
  const allowedTypes = [
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/json',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Solo se permiten archivos PDF, XML o JSON',
    };
  }

  return uploadToStorage(tenantId, 'invoices', file);
}

/**
 * Subir documento (contrato, certificado, etc)
 */
export async function uploadDocument(
  tenantId: string,
  file: File
): Promise<UploadResult> {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Formato no permitido. Usa PDF, Word o Excel',
    };
  }

  return uploadToStorage(tenantId, 'documents', file);
}
