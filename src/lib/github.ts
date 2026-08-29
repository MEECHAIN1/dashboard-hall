import { getRegistryEntry } from './productionFileRegistry';

const GITHUB_API = 'https://api.github.com';

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN ไม่ได้ตั้งค่า');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!owner || !repo) throw new Error('GITHUB_OWNER หรือ GITHUB_REPO ไม่ได้ตั้งค่า');
  return { owner, repo, branch };
}

// Strictly accepts only registry ID, never raw client paths — prevents path traversal & open proxy
export async function getFileContentById(id: string) {
  const entry = getRegistryEntry(id);
  if (!entry) throw new Error(`Unknown file id: ${id}`);

  const { owner, repo, branch } = getRepoConfig();
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${entry.targetPath}?ref=${branch}`,
    { headers: githubHeaders(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText} (${entry.name})`);

  const json = (await res.json()) as any;
  if (Array.isArray(json) || json.type !== 'file') {
    throw new Error(`${entry.name} ไม่ใช่ไฟล์เดี่ยว`);
  }

  return {
    id: entry.id,
    name: entry.name,
    targetPath: entry.targetPath,
    category: entry.category,
    language: entry.language,
    description: entry.description,
    content: Buffer.from(json.content, 'base64').toString('utf-8'),
    sha: json.sha as string,
    size: json.size as number,
    htmlUrl: json.html_url as string,
    source: 'github-live' as const,
  };
}

export async function getLatestWorkflowRun() {
  const { owner, repo } = getRepoConfig();
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/runs?per_page=1`, {
    headers: githubHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GitHub Actions API ${res.status}: ${res.statusText}`);

  const json = (await res.json()) as any;
  const run = json.workflow_runs?.[0];
  if (!run) return null;

  return {
    status: run.status as string, // "completed" | "in_progress" | "queued"
    conclusion: run.conclusion as string | null, // "success" | "failure" | null
    branch: run.head_branch as string,
    commitSha: (run.head_sha as string)?.slice(0, 7),
    url: run.html_url as string,
    updatedAt: run.updated_at as string,
  };
}

export async function getLatestCommitSha() {
  const { owner, repo, branch } = getRepoConfig();
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${branch}`, {
    headers: githubHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GitHub Commits API ${res.status}: ${res.statusText}`);

  const json = (await res.json()) as any;
  return {
    sha: json.sha as string,
    shortSha: (json.sha as string)?.slice(0, 7),
    message: json.commit?.message as string,
    date: json.commit?.author?.date as string,
  };
}
