import { NextRequest, NextResponse } from 'next/server';

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
  head_branch: string;
}

interface GitHubMetrics {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  recentRuns: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    duration: number;
    branch: string;
    url: string;
    timestamp: string;
  }>;
  byWorkflow: Record<
    string,
    {
      total: number;
      success: number;
      failure: number;
      successRate: number;
    }
  >;
}

export async function GET(request: NextRequest) {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'kiabusiness2025/verifactu-monorepo';

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    // Fetch recent workflow runs
    const response = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=50`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    const runs: WorkflowRun[] = data.workflow_runs;

    // Calculate metrics
    const metrics: GitHubMetrics = {
      totalRuns: runs.length,
      successRate: 0,
      avgDuration: 0,
      recentRuns: [],
      byWorkflow: {},
    };

    let successCount = 0;
    let totalDuration = 0;

    runs.forEach((run) => {
      // Calculate duration
      const start = new Date(run.run_started_at).getTime();
      const end = new Date(run.updated_at).getTime();
      const duration = Math.round((end - start) / 1000); // seconds

      // Add to recent runs
      metrics.recentRuns.push({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        duration,
        branch: run.head_branch,
        url: run.html_url,
        timestamp: run.created_at,
      });

      // Count successes
      if (run.conclusion === 'success') {
        successCount++;
      }

      // Track by workflow
      if (!metrics.byWorkflow[run.name]) {
        metrics.byWorkflow[run.name] = {
          total: 0,
          success: 0,
          failure: 0,
          successRate: 0,
        };
      }

      metrics.byWorkflow[run.name].total++;
      if (run.conclusion === 'success') {
        metrics.byWorkflow[run.name].success++;
      } else if (run.conclusion === 'failure') {
        metrics.byWorkflow[run.name].failure++;
      }

      totalDuration += duration;
    });

    // Calculate averages
    metrics.successRate = runs.length > 0 ? Math.round((successCount / runs.length) * 100) : 0;

    metrics.avgDuration = runs.length > 0 ? Math.round(totalDuration / runs.length) : 0;

    // Calculate success rates per workflow
    Object.keys(metrics.byWorkflow).forEach((workflow) => {
      const stats = metrics.byWorkflow[workflow];
      stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching CI/CD metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
