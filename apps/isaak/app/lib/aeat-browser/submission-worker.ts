// Worker que procesa los IsaakAeatSubmission con status='pending_aeat'.
//
// Flujo:
//   1. Lee submissions pendientes (limit configurable)
//   2. Por cada una:
//      a. Marca como 'submitting'
//      b. Genera el fichero BOE (via serializer del modelo)
//      c. Carga el cert del tenant y lo descifra
//      d. Llama a submitModelo303() con un BrowserAdapter real
//      e. Actualiza el status: 'accepted' / 'rejected' / 'error'
//   3. Loguea estadísticas
//
// Este worker debe correr en un host CON disco persistente y capacidad
// de instalar binarios (NO Vercel serverless). Opciones recomendadas:
//   - Cloud Run (con disk mounted)
//   - Fly.io
//   - Render workers
//   - EC2 micro
//   - GitHub Actions cron (para baja frecuencia)
//   - Máquina local del usuario (para el pilot inicial)

import { prisma } from '../prisma';
import {
  submitModelo303,
  type BrowserAdapter,
  type Modelo303SubmissionResult,
} from './index';

export type WorkerResult = {
  processed: number;
  accepted: number;
  rejected: number;
  errors: number;
  details: Array<{
    submissionId: string;
    finalStatus: string;
    csvJustificante?: string;
    errorMessage?: string;
  }>;
};

export type WorkerInput = {
  // Adapter factory — instancia un BrowserAdapter por cada submission.
  // En producción esto sería () => new PlaywrightBrowserAdapter().
  // En tests, () => new MockBrowserAdapter(...).
  adapterFactory: () => BrowserAdapter;
  // Cuántas submissions procesar como máximo en esta corrida.
  maxBatch?: number;
  // Entorno AEAT: 'pre' o 'prod'. Determina las URLs.
  environment: 'pre' | 'prod';
};

// Cifrado: reutilizamos lo de Isaak (compartido con Verifactu).
async function loadTenantCertPem(tenantId: string): Promise<{
  certPem: string;
  keyPem: string;
} | null> {
  const { loadTenantCertPem: load } = await import('../aeat-sede');
  const cert = await load(tenantId);
  if (!cert) return null;
  return { certPem: cert.certPem, keyPem: cert.keyPem };
}

// Genera el fichero .303 en el filesystem y devuelve el path.
async function ensureFichero303(submissionId: string): Promise<string> {
  const sub = await prisma.isaakAeatSubmission.findUnique({
    where: { id: submissionId },
    select: { tenantId: true, model: true, period: true, payload: true },
  });
  if (!sub) throw new Error(`Submission ${submissionId} not found`);
  if (sub.model !== '303') {
    throw new Error(`Worker v1 solo soporta modelo 303, recibió ${sub.model}`);
  }

  // Re-construir el fichero a partir del payload guardado en la
  // submission (audit-log inmutable). Esto garantiza que enviamos
  // exactamente lo que el usuario confirmó.
  const { serialize303 } = await import('../aeat-formats/303/serializer');

  // El payload tiene la estructura que createSubmission guardó.
  // Reconstruimos un Modelo303Result aproximado para el serializer.
  const p = sub.payload as Record<string, unknown>;
  const result303 = {
    ejercicio: p.ejercicio as number,
    periodo: p.periodo as '1T' | '2T' | '3T' | '4T',
    repercutido: (p.repercutidoPorTipo as Array<{ tipo: number; base: number; cuota: number }>) ?? [],
    soportado: (p.soportadoPorTipo as Array<{ tipo: number; base: number; cuota: number }>) ?? [],
    totalDevengado: (p.totalDevengado as number) ?? 0,
    totalSoportado: (p.totalSoportado as number) ?? 0,
    resultado: (p.resultado as number) ?? 0,
    facturas: (p.facturas as number) ?? 0,
    compras: (p.compras as number) ?? 0,
    advertencias: (p.advertencias as string[]) ?? [],
  };

  const tenant = await prisma.tenant.findUnique({
    where: { id: sub.tenantId },
    select: { nif: true, name: true, legalName: true },
  });
  if (!tenant?.nif) {
    throw new Error('Tenant sin NIF, no se puede serializar');
  }

  const out = serialize303(result303, {
    companyVat: tenant.nif,
    companyName: tenant.legalName ?? tenant.name ?? '',
    programVersion: 'ISAK',
  });
  if (!out.ok) throw new Error(`Serialize failed: ${out.error}`);

  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'aeat-303-'));
  const path = join(dir, `${tenant.nif}-303-${sub.period}.303`);
  writeFileSync(path, out.bytes);
  return path;
}

export async function processPendingSubmissions(
  input: WorkerInput,
): Promise<WorkerResult> {
  const result: WorkerResult = {
    processed: 0,
    accepted: 0,
    rejected: 0,
    errors: 0,
    details: [],
  };

  const pending = await prisma.isaakAeatSubmission.findMany({
    where: { status: 'pending_aeat', model: '303' },
    orderBy: { submittedAt: 'asc' },
    take: input.maxBatch ?? 10,
  });

  for (const sub of pending) {
    result.processed++;
    // Marca como submitting para evitar doble-procesado si otro worker corre
    await prisma.isaakAeatSubmission.update({
      where: { id: sub.id },
      data: { status: 'submitted' as never },
    });

    try {
      const cert = await loadTenantCertPem(sub.tenantId);
      if (!cert) {
        await markError(sub.id, 'No hay certificado válido para el tenant');
        result.errors++;
        result.details.push({ submissionId: sub.id, finalStatus: 'error', errorMessage: 'no cert' });
        continue;
      }

      const ficheroPath = await ensureFichero303(sub.id);
      const tenant = await prisma.tenant.findUnique({
        where: { id: sub.tenantId },
        select: { nif: true },
      });

      const adapter = input.adapterFactory();
      const submissionResult = await submitModelo303(
        {
          ficheroPath,
          declaranteNif: tenant?.nif ?? '',
          cert,
          environment: input.environment,
        },
        adapter,
      );

      await persistResult(sub.id, submissionResult);

      if (submissionResult.status === 'accepted') result.accepted++;
      else if (submissionResult.status === 'rejected') result.rejected++;
      else result.errors++;

      result.details.push({
        submissionId: sub.id,
        finalStatus: submissionResult.status,
        ...(submissionResult.status === 'accepted'
          ? { csvJustificante: submissionResult.csvJustificante }
          : {}),
        ...(submissionResult.status !== 'accepted'
          ? { errorMessage: submissionResult.errorMessage ?? '' }
          : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markError(sub.id, msg);
      result.errors++;
      result.details.push({ submissionId: sub.id, finalStatus: 'error', errorMessage: msg });
    }
  }

  return result;
}

async function markError(submissionId: string, errorMessage: string): Promise<void> {
  await prisma.isaakAeatSubmission.update({
    where: { id: submissionId },
    data: { status: 'error', errorMessage },
  });
}

async function persistResult(
  submissionId: string,
  result: Modelo303SubmissionResult,
): Promise<void> {
  if (result.status === 'accepted') {
    await prisma.isaakAeatSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'accepted',
        aeatReference: result.csvJustificante,
        aeatResponse: { snippet: result.aeatResponseSnippet, submittedAt: result.submittedAt.toISOString() } as never,
        ackedAt: result.submittedAt,
      },
    });
  } else if (result.status === 'rejected') {
    await prisma.isaakAeatSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'rejected',
        errorMessage: result.errorMessage,
        aeatResponse: {
          snippet: result.aeatResponseSnippet,
          errorCode: result.errorCode,
          submittedAt: result.submittedAt.toISOString(),
        } as never,
        ackedAt: result.submittedAt,
      },
    });
  } else {
    await prisma.isaakAeatSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'error',
        errorMessage: result.errorMessage,
      },
    });
  }
}
