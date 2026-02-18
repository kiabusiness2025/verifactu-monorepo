import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { rateLimit } from '@/lib/rateLimit';

type ErrorReport = {
  type: 'broken_image' | 'broken_link' | 'empty_button' | 'slow_load' | 'console_error' | 'runtime_error' | 'not_found';
  details: any;
  url: string;
  timestamp: string;
};

type ErrorBatch = {
  errors: ErrorReport[];
  userAgent: string;
  viewport: { width: number; height: number };
  performance?: any;
};

type IsaakAnalysis = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  fixable: boolean;
  suggestedFix?: string;
  affectedFiles?: string[];
  action: 'auto_fix' | 'manual_review' | 'ignore';
};

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'token',
  'password',
  'secret',
  'email',
  'phone',
  'nif',
  'cif',
  'dni'
]);

function maskString(value: string) {
  const trimmed = value.length > 500 ? `${value.slice(0, 500)}…` : value;
  const withoutEmails = trimmed.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    '[redacted-email]'
  );
  return withoutEmails.replace(
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    '[redacted-token]'
  );
}

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[redacted-depth]';
  if (typeof value === 'string') return maskString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};
    for (const [key, item] of entries) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[redacted]';
        continue;
      }
      result[key] = sanitizePayload(item, depth + 1);
    }
    return result;
  }
  return '[redacted]';
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function isAutoFixEnabled() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.ENABLE_ISAAK_AUTO_FIX === 'true';
  }
  return process.env.ENABLE_ISAAK_AUTO_FIX !== 'false';
}

export async function POST(request: NextRequest) {
  try {
    const monitorToken = process.env.MONITOR_API_TOKEN;
    if (process.env.NODE_ENV === 'production' && !monitorToken) {
      return new NextResponse(null, { status: 204 });
    }
    if (monitorToken) {
      const headerToken = request.headers.get('x-monitor-token') ?? getBearerToken(request);
      if (!headerToken || headerToken !== monitorToken) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const limiter = rateLimit(request, {
      limit: 60,
      windowMs: 60_000,
      keyPrefix: 'monitor-error'
    });
    if (!limiter.ok) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<ErrorBatch>;
    const errors = Array.isArray(body.errors) ? body.errors : [];
    const userAgent = body.userAgent ?? 'unknown';
    const viewport = body.viewport ?? { width: 0, height: 0 };
    const perfData = body.performance;
    const source = request.headers.get('host') ?? 'unknown';

    const sanitizedErrors = errors.slice(0, 25).map((error) => ({
      ...error,
      details: sanitizePayload(error.details)
    }));
    const sanitizedPerformance = sanitizePayload(perfData);

    console.log(`[ERROR MONITOR] Received ${sanitizedErrors.length} error(s) from ${source}.`);

    if (sanitizedErrors.length === 0) {
      return NextResponse.json({
        success: true,
        received: 0,
        analyses: [],
        autoFixTriggered: false
      });
    }

    // Analizar errores con Isaak
    const analyses = await Promise.all(
      sanitizedErrors.map(error => analyzeWithIsaak(error))
    );

    // Filtrar errores que requieren auto-fix
    const criticalErrors = analyses.filter(
      a => a.action === 'auto_fix' && ['critical', 'high'].includes(a.severity)
    );

    const autoFixEnabled = isAutoFixEnabled();
    if (autoFixEnabled && criticalErrors.length > 0) {
      console.log(`[ISAAK] ${criticalErrors.length} errores críticos detectados. Iniciando auto-fix...`);
      
      // Trigger auto-fix workflow
      await triggerAutoFix(sanitizedErrors.filter((_, idx) => 
        analyses[idx].action === 'auto_fix'
      ));
    }

    // Guardar en base de datos (best-effort, no bloquea la respuesta)
    try {
      await Promise.all(
        sanitizedErrors.map(error =>
          prisma.errorEvent.create({
            data: {
              source,
              type: error.type,
              url: error.url,
              details: error.details ?? undefined,
              userAgent,
              viewport,
              performance: sanitizedPerformance ?? undefined
            }
          })
        )
      );
    } catch (dbError) {
      console.error('[ERROR MONITOR] Failed to persist error events:', dbError);
    }

    return NextResponse.json({
      success: true,
      received: sanitizedErrors.length,
      analyses,
      autoFixTriggered: autoFixEnabled && criticalErrors.length > 0
    });

  } catch (error) {
    console.error('[ERROR MONITOR] Failed to process error report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

async function analyzeWithIsaak(error: ErrorReport): Promise<IsaakAnalysis> {
  // Análisis automático basado en tipo de error
  switch (error.type) {
    case 'broken_image':
      return {
        severity: 'high',
        fixable: true,
        suggestedFix: `Imagen rota: ${error.details.src}. Verificar que el archivo existe o usar imagen placeholder.`,
        affectedFiles: [error.details.src],
        action: 'auto_fix'
      };

    case 'broken_link':
      return {
        severity: 'medium',
        fixable: true,
        suggestedFix: `Enlace roto: ${error.details.href}. Verificar ruta o remover enlace.`,
        affectedFiles: [],
        action: 'manual_review'
      };

    case 'empty_button':
      return {
        severity: 'medium',
        fixable: true,
        suggestedFix: 'Botón sin contenido detectado. Añadir texto o icono.',
        affectedFiles: [],
        action: 'auto_fix'
      };

    case 'slow_load':
      return {
        severity: error.details.loadTime > 10000 ? 'high' : 'medium',
        fixable: true,
        suggestedFix: `Carga lenta (${error.details.loadTime}ms). Optimizar recursos o implementar lazy loading.`,
        affectedFiles: [],
        action: error.details.loadTime > 10000 ? 'auto_fix' : 'manual_review'
      };

    case 'console_error':
      return {
        severity: 'high',
        fixable: false,
        suggestedFix: `Error en consola: ${error.details.message}`,
        affectedFiles: [],
        action: 'manual_review'
      };

    case 'runtime_error':
      return {
        severity: 'critical',
        fixable: true,
        suggestedFix: `Error en tiempo de ejecución: ${error.details.message}`,
        affectedFiles: error.details.stack ? extractFilesFromStack(error.details.stack) : [],
        action: 'auto_fix'
      };

    case 'not_found':
      return {
        severity: 'medium',
        fixable: true,
        suggestedFix: `Página no encontrada: ${error.url}`,
        affectedFiles: [],
        action: 'manual_review'
      };

    default:
      return {
        severity: 'low',
        fixable: false,
        action: 'ignore'
      };
  }
}

function extractFilesFromStack(stack: string): string[] {
  const fileRegex = /(?:at|@)\s+(?:.*?\s+\()?(.+?:\d+:\d+)\)?/g;
  const files: string[] = [];
  let match;

  while ((match = fileRegex.exec(stack)) !== null) {
    const filePath = match[1].split(':')[0];
    if (filePath && !files.includes(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

async function triggerAutoFix(errors: ErrorReport[]) {
  try {
    // Opción 1: Usar GitHub Actions workflow_dispatch
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPOSITORY || 'owner/repo';

    if (!githubToken) {
      console.warn('[ISAAK] GITHUB_TOKEN no configurado. No se puede trigger auto-fix.');
      return;
    }

    const [owner, repo] = githubRepo.split('/');

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/auto-fix-and-deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            error_context: JSON.stringify(errors),
            auto_fix: 'true'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    console.log('[ISAAK] Auto-fix workflow triggered successfully');

  } catch (error) {
    console.error('[ISAAK] Failed to trigger auto-fix:', error);
  }
}
