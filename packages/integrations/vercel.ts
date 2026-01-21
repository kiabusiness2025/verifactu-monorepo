export const vercelClient = {
  token: process.env.VERCEL_TOKEN || '',
  teamId: process.env.VERCEL_TEAM_ID || '',
  baseUrl: 'https://api.vercel.com',
};

export async function getDeployments(projectName?: string, limit = 20) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      teamId: vercelClient.teamId,
    });

    if (projectName) {
      params.append('projectId', projectName);
    }

    const response = await fetch(`${vercelClient.baseUrl}/v6/deployments?${params}`, {
      headers: {
        Authorization: `Bearer ${vercelClient.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw error;
  }
}

export async function getDeploymentStatus(deploymentId: string) {
  try {
    const response = await fetch(
      `${vercelClient.baseUrl}/v13/deployments/${deploymentId}?teamId=${vercelClient.teamId}`,
      {
        headers: {
          Authorization: `Bearer ${vercelClient.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching deployment status:', error);
    throw error;
  }
}

export async function listProjects() {
  try {
    const response = await fetch(
      `${vercelClient.baseUrl}/v9/projects?teamId=${vercelClient.teamId}`,
      {
        headers: {
          Authorization: `Bearer ${vercelClient.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing projects:', error);
    throw error;
  }
}
