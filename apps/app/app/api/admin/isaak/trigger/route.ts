import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorContext, autoFix = true } = body;

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPOSITORY || process.env.NEXT_PUBLIC_GITHUB_REPOSITORY;

    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: 'GITHUB_TOKEN no configurado' },
        { status: 500 }
      );
    }

    if (!githubRepo || !githubRepo.includes('/')) {
      return NextResponse.json(
        { success: false, error: 'GITHUB_REPOSITORY no configurado correctamente' },
        { status: 500 }
      );
    }

    const [owner, repo] = githubRepo.split('/');

    console.log(`[ISAAK TRIGGER] Triggering auto-fix workflow for ${owner}/${repo}`);
    console.log(`[ISAAK TRIGGER] Error context:`, errorContext);

    // Disparar workflow de GitHub
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/auto-fix-and-deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            error_context: typeof errorContext === 'string' 
              ? errorContext 
              : JSON.stringify(errorContext),
            auto_fix: String(autoFix)
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ISAAK TRIGGER] GitHub API error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `GitHub API error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    console.log('[ISAAK TRIGGER] Workflow triggered successfully');

    return NextResponse.json({
      success: true,
      message: 'Auto-fix workflow triggered successfully',
      repository: `${owner}/${repo}`,
      workflow: 'auto-fix-and-deploy.yml'
    });

  } catch (error) {
    console.error('[ISAAK TRIGGER] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
