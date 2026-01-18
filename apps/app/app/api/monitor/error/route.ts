import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const body: ErrorBatch = await request.json();
    const { errors, userAgent, viewport, performance: perfData } = body;

    console.log(`[ERROR MONITOR] Received ${errors.length} error(s):`);
    errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.type} at ${err.url}`);
      console.log(`     Details:`, JSON.stringify(err.details, null, 2));
    });

    // Analizar errores con Isaak
    const analyses = await Promise.all(
      errors.map(error => analyzeWithIsaak(error))
    );

    // Filtrar errores que requieren auto-fix
    const criticalErrors = analyses.filter(
      a => a.action === 'auto_fix' && ['critical', 'high'].includes(a.severity)
    );

    if (criticalErrors.length > 0) {
      console.log(`[ISAAK] ${criticalErrors.length} errores críticos detectados. Iniciando auto-fix...`);
      
      // Trigger auto-fix workflow
      await triggerAutoFix(errors.filter((_, idx) => 
        analyses[idx].action === 'auto_fix'
      ));
    }

    // Guardar en base de datos (opcional)
    // await saveErrorsToDatabase(errors, analyses);

    return NextResponse.json({
      success: true,
      received: errors.length,
      analyses,
      autoFixTriggered: criticalErrors.length > 0
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
