import { app } from '@/lib/firebase';
import { verifySessionTokenFromEnv } from '@verifactu/utils';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { NextRequest, NextResponse } from 'next/server';

const storage = getStorage(app);

/**
 * API para subir foto de perfil a Firebase Storage
 *
 * Acepta:
 * - Data URL (base64) - lo convierte a Blob y sube a Firebase
 * - URL externa - la retorna tal cual (ej: Google, Facebook OAuth)
 */
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const payload = await verifySessionTokenFromEnv(sessionCookie);
    if (!payload?.uid) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json();
    const { photoURL } = body;

    if (!photoURL || typeof photoURL !== 'string') {
      return NextResponse.json({ error: 'Invalid photoURL' }, { status: 400 });
    }

    // Si ya es una URL HTTP, retornarla tal cual (ej: desde OAuth providers)
    if (photoURL.startsWith('http://') || photoURL.startsWith('https://')) {
      return NextResponse.json({
        ok: true,
        photoURL,
        message: 'Using external URL',
      });
    }

    // Validar que sea un data URL
    if (!photoURL.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'photoURL must be a valid data URL or HTTP URL' },
        { status: 400 }
      );
    }

    // Extraer tipo MIME y datos base64
    const matches = photoURL.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Validar tipo de imagen
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Convertir base64 a Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Validar tamaño (5MB máximo)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 });
    }

    // Determinar extensión del archivo
    const extension = mimeType.split('/')[1] || 'jpg';
    const fileName = `${payload.uid}_${Date.now()}.${extension}`;
    const storagePath = `profile-photos/${fileName}`;

    // Subir a Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, buffer, {
      contentType: mimeType,
      customMetadata: {
        userId: payload.uid,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Obtener URL pública
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({
      ok: true,
      photoURL: downloadURL,
      message: 'Photo uploaded to Firebase Storage',
    });
  } catch (error) {
    console.error('POST /api/user/upload-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
