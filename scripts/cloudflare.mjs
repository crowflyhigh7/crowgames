const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const projectName = 'crowgames';
const domain = 'games.iamchang.me';
const phase = process.argv[2];

if (!account || !token || !['project', 'domain'].includes(phase)) {
  throw new Error('Cloudflare credentials and a project or domain phase are required.');
}

const base = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`;
async function request(path, { method = 'GET', body, allowMissing = false } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (allowMissing && response.status === 404) return null;
  if (!response.ok || !payload.success) {
    const codes = (payload.errors || []).map((error) => error.code).join(', ');
    throw new Error(`Cloudflare ${method} request failed: HTTP ${response.status}, codes ${codes}.`);
  }
  return payload.result;
}

if (phase === 'project') {
  let project = await request(`/${projectName}`, { allowMissing: true });
  if (!project) {
    project = await request('', {
      method: 'POST',
      body: { name: projectName, production_branch: 'main' },
    });
    console.log(`Created Pages project ${projectName}.`);
  }
  console.log(`Pages URL: https://${project.subdomain}`);
} else {
  const project = await request(`/${projectName}`);
  const domains = await request(`/${projectName}/domains`);
  let entry = domains.find((item) => item.name === domain);
  if (!entry) {
    entry = await request(`/${projectName}/domains`, {
      method: 'POST',
      body: { name: domain },
    });
  }
  console.log(`Custom domain ${domain}: ${entry.status}.`);
  console.log(`Required DNS record: CNAME games -> ${project.subdomain}`);
}
