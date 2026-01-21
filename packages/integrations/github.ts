export const githubClient = {
  token: process.env.GITHUB_TOKEN || '',
  owner: process.env.GITHUB_OWNER || 'kiabusiness2025',
  repo: process.env.GITHUB_REPO || 'verifactu-monorepo',
  baseUrl: 'https://api.github.com',
};

export async function createIssue({
  title,
  body,
  labels,
  assignees,
}: {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}) {
  try {
    const response = await fetch(
      `${githubClient.baseUrl}/repos/${githubClient.owner}/${githubClient.repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubClient.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ title, body, labels, assignees }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
}

export async function listIssues({
  state = 'open',
  labels,
  limit = 30,
}: {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  limit?: number;
}) {
  try {
    const params = new URLSearchParams({
      state,
      per_page: limit.toString(),
    });

    if (labels) {
      params.append('labels', labels);
    }

    const response = await fetch(
      `${githubClient.baseUrl}/repos/${githubClient.owner}/${githubClient.repo}/issues?${params}`,
      {
        headers: {
          Authorization: `Bearer ${githubClient.token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing issues:', error);
    throw error;
  }
}

export async function getWorkflowRuns(limit = 10) {
  try {
    const response = await fetch(
      `${githubClient.baseUrl}/repos/${githubClient.owner}/${githubClient.repo}/actions/runs?per_page=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${githubClient.token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    throw error;
  }
}
