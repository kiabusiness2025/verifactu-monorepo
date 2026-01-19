import { getSessionPayload } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering for this API route (uses cookies for session)
export const dynamic = 'force-dynamic';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, email: true }
    });

    // Verificar si el usuario es admin (basado en email o lista)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = adminEmails.includes(user?.email || '');
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'deployments';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json({
        error: 'Vercel credentials not configured',
        deployments: []
      });
    }

    let data;

    switch (action) {
      case 'deployments':
        data = await getDeployments(limit);
        break;
      case 'status':
        data = await getProjectStatus();
        break;
      case 'logs':
        const deploymentId = searchParams.get('id');
        if (!deploymentId) {
          return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
        }
        data = await getDeploymentLogs(deploymentId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Vercel API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Vercel data' },
      { status: 500 }
    );
  }
}

async function getDeployments(limit: number = 10) {
  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=${limit}`
    : `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    deployments: data.deployments.map((d: any) => ({
      id: d.uid,
      name: d.name,
      url: d.url,
      state: d.state, // READY, ERROR, BUILDING, etc.
      createdAt: d.createdAt,
      ready: d.ready,
      target: d.target, // production, preview
      creator: d.creator?.username,
      buildingAt: d.buildingAt,
      readyAt: d.readyAt,
      meta: {
        githubCommitMessage: d.meta?.githubCommitMessage,
        githubCommitSha: d.meta?.githubCommitSha,
        githubCommitRef: d.meta?.githubCommitRef
      }
    }))
  };
}

async function getProjectStatus() {
  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`);
  }

  const project = await response.json();

  return {
    name: project.name,
    framework: project.framework,
    updatedAt: project.updatedAt,
    latestDeployments: project.latestDeployments?.map((d: any) => ({
      id: d.uid,
      url: d.url,
      state: d.state,
      createdAt: d.createdAt,
      target: d.target
    }))
  };
}

async function getDeploymentLogs(deploymentId: string) {
  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v2/deployments/${deploymentId}/events?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v2/deployments/${deploymentId}/events`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    logs: data.events?.map((event: any) => ({
      type: event.type,
      message: event.payload?.text || event.type,
      timestamp: event.timestamp
    })) || []
  };
}
