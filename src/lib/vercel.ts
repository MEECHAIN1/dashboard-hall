function getVercelConfig() {
  const token = (process.env.VERCEL_API_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const rawProjectId = (process.env.VERCEL_PROJECT_ID || '').trim().replace(/^["']|["']$/g, '');
  const rawTeamId = (process.env.VERCEL_TEAM_ID || '').trim().replace(/^["']|["']$/g, '');

  return {
    token,
    projectId: rawProjectId,
    teamId: rawTeamId || undefined,
  };
}

function vercelHeaders(token: string) {
  if (!token) throw new Error('VERCEL_API_TOKEN ไม่ได้ตั้งค่า');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getLatestDeployment() {
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) throw new Error('VERCEL_API_TOKEN ไม่ได้ตั้งค่า');
  if (!projectId) throw new Error('VERCEL_PROJECT_ID ไม่ได้ตั้งค่า');

  const headers = vercelHeaders(token);

  // Strategy 1: Query deployments by projectId / app name & teamId
  const candidateParams: URLSearchParams[] = [];

  // If it looks like a Project ID (prj_...)
  if (projectId.startsWith('prj_')) {
    const p = new URLSearchParams({ projectId, limit: '1', target: 'production' });
    if (teamId) p.set('teamId', teamId);
    candidateParams.push(p);

    const pAll = new URLSearchParams({ projectId, limit: '1' });
    if (teamId) pAll.set('teamId', teamId);
    candidateParams.push(pAll);
  } else {
    // Project Name / slug (e.g. meechain-dashboard, meechain-monorepo)
    const pApp = new URLSearchParams({ app: projectId, limit: '1', target: 'production' });
    if (teamId) pApp.set('teamId', teamId);
    candidateParams.push(pApp);

    const pProj = new URLSearchParams({ projectId, limit: '1', target: 'production' });
    if (teamId) pProj.set('teamId', teamId);
    candidateParams.push(pProj);

    const pAppAll = new URLSearchParams({ app: projectId, limit: '1' });
    if (teamId) pAppAll.set('teamId', teamId);
    candidateParams.push(pAppAll);
  }

  let lastStatus = 0;
  let lastErrorMessage = '';

  for (const params of candidateParams) {
    try {
      const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
        headers,
        cache: 'no-store',
      });

      lastStatus = res.status;

      if (res.ok) {
        const json = (await res.json()) as any;
        const dep = json.deployments?.[0];
        if (dep) {
          return {
            state: dep.state as string, // READY | BUILDING | ERROR | QUEUED | CANCELED
            url: dep.url as string,
            target: dep.target || 'production',
            createdAt: dep.createdAt as number,
            commitSha: dep.meta?.githubCommitSha as string | undefined,
            teamIdUsed: teamId || undefined,
          };
        }
      } else {
        const errJson = (await res.json().catch(() => ({}))) as any;
        lastErrorMessage = errJson?.error?.message || errJson?.message || res.statusText;
      }
    } catch (err) {
      lastErrorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  // Strategy 2: If deployments search failed, try fetching the project metadata directly via /v9/projects/{projectId}
  try {
    const projectUrl = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}`);
    if (teamId) projectUrl.searchParams.set('teamId', teamId);

    const projRes = await fetch(projectUrl.toString(), { headers, cache: 'no-store' });
    if (projRes.ok) {
      const projJson = (await projRes.json()) as any;
      const latestDeploy = projJson.targets?.production || projJson.latestDeployments?.[0];
      if (latestDeploy) {
        return {
          state: (latestDeploy.readyState || latestDeploy.state || 'READY') as string,
          url: (latestDeploy.url || `${projectId}.vercel.app`) as string,
          target: 'production',
          createdAt: (latestDeploy.createdAt || Date.now()) as number,
          commitSha: (latestDeploy.meta?.githubCommitSha || latestDeploy.gitSource?.ref) as string | undefined,
          teamIdUsed: teamId || undefined,
        };
      }
    } else {
      lastStatus = projRes.status;
      const errJson = (await projRes.json().catch(() => ({}))) as any;
      if (errJson?.error?.message) {
        lastErrorMessage = errJson.error.message;
      }
    }
  } catch (err) {
    // continue to diagnostic
  }

  if (lastStatus === 403) {
    const scopeExplanation = teamId
      ? `Token ยังไม่ได้รับสิทธิ์เข้าถึง Team ID: ${teamId} (ใน Vercel: Account Settings -> Tokens ต้องเลือก Scope เป็น Team '${teamId}')`
      : 'Vercel API 403: Forbidden (โปรเจกต์อาจอยู่ใต้ Team กรุณาระบุ VERCEL_TEAM_ID หรือสร้าง Token ที่มี Scope ครอบคลุม)';
    throw new Error(`Vercel 403: ${lastErrorMessage || 'Not Authorized'} — ${scopeExplanation}`);
  }

  if (lastStatus === 404) {
    throw new Error(`Vercel 404: ไม่พบโปรเจกต์ '${projectId}' (ตรวจสอบ VERCEL_PROJECT_ID หรือชื่อโปรเจกต์ใน Team ${teamId || 'Personal'})`);
  }

  throw new Error(`Vercel API ${lastStatus || 'Error'}: ${lastErrorMessage || 'Failed to fetch deployment'}`);
}


