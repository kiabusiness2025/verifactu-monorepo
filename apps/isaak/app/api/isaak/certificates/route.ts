import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { encryptCert } from '@/app/lib/certificate-crypto';
import { readP12 } from '@/app/lib/p12-reader';

export const runtime = 'nodejs';

const MAX_P12_SIZE = 512 * 1024; // 512 KB — P12 files are small

// GET — list certificates (metadata only, no private key)
export async function GET(_req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const certs = await prisma.tenantCertificate.findMany({
    where: { tenantId: session.tenantId },
    select: {
      id: true,
      certType: true,
      nif: true,
      commonName: true,
      issuer: true,
      validFrom: true,
      validTo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ certs });
}

// POST — upload P12/PFX certificate
export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 });

  const file = formData.get('file') as File | null;
  const password = (formData.get('password') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

  const ext = file.name.toLowerCase();
  if (!ext.endsWith('.p12') && !ext.endsWith('.pfx')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos .p12 o .pfx' }, { status: 415 });
  }
  if (file.size > MAX_P12_SIZE) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx 512 KB)' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const p12Buffer = Buffer.from(arrayBuffer);

  // Validate and extract metadata from P12
  let certInfo;
  try {
    certInfo = readP12(p12Buffer, password);
  } catch {
    return NextResponse.json(
      { error: 'No se pudo leer el certificado. Verifica que la contraseña sea correcta.' },
      { status: 422 }
    );
  }

  // Check expiry
  if (certInfo.validTo < new Date()) {
    return NextResponse.json(
      { error: `El certificado expiró el ${certInfo.validTo.toLocaleDateString('es-ES')}` },
      { status: 422 }
    );
  }

  // Encrypt P12 before storing
  const { encrypted, iv, authTag } = encryptCert(p12Buffer);

  // Remove any existing cert with same NIF (only one per NIF per tenant)
  await prisma.tenantCertificate.deleteMany({
    where: { tenantId: session.tenantId, nif: certInfo.nif },
  });

  const cert = await prisma.tenantCertificate.create({
    data: {
      tenantId: session.tenantId,
      certType: certInfo.certType,
      nif: certInfo.nif,
      commonName: certInfo.commonName,
      issuer: certInfo.issuer,
      validFrom: certInfo.validFrom,
      validTo: certInfo.validTo,
      encryptedP12: encrypted,
      iv,
      authTag,
    },
    select: {
      id: true,
      certType: true,
      nif: true,
      commonName: true,
      issuer: true,
      validFrom: true,
      validTo: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, cert });
}
