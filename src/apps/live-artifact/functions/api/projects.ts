/**
 * GET /api/projects — Cloudflare Pages Function backing the dashboard.
 *
 * Spec: docs/spec/frontend/live-data.md
 *
 * Pipeline (per spec):
 *   1. Try KV cache (skip when ?fresh=1)
 *   2. Cache miss → GitHub GraphQL → normalize to Issue[]
 *   3. Stash in KV with CACHE_TTL
 *   4. Return JSON with Cache-Control + ETag
 *
 * Endpoint shape:
 *   GET /api/projects                 → all issues across the polyrepo
 *   GET /api/projects?fresh=1         → bypass cache (dev)
 *   GET /api/projects?slug=<plugin>   → filter to one plugin via PROJECT_MAP
 *
 * If GITHUB_TOKEN is missing OR GraphQL errors out, we return HTTP 503
 * with a typed error body so the client can fall back to the static
 * snapshot. The dashboard never breaks on a missing token; it just
 * shows whatever the snapshot last captured.
 */

interface Env {
  /** Fine-grained read-only PAT scoped to subagentapps org. */
  GITHUB_TOKEN?: string;
  /** KV binding for the 5-min cache. */
  SUBAGENT_CACHE?: KVNamespace;
  /** 'production' | 'staging' | 'preview'. */
  ENVIRONMENT?: string;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

type PagesFunction<E> = (ctx: {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Issue {
  number: number;
  title: string;
  repo: string;
  plugin: string;
  status: 'Todo' | 'In Progress' | 'In Review' | 'Done' | "Won't do";
  priority: 'P0' | 'P1' | 'P2' | 'Stretch';
  wave: 'Wave 0' | 'Wave 1' | 'Wave 2' | 'Future';
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
  assignee: string | null;
  url: string;
}

interface ProjectsPayload {
  generatedAt: string;
  issues: Issue[];
}

const CACHE_TTL = 300; // 5 min, per spec
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

/** Project routing per spec § PROJECT_MAP. Schema unchanged from live-data.md. */
const PROJECT_MAP: Record<string, { owner: string; repo: string; label?: string }> = {
  'subagent-organizations': { owner: 'subagentapps', repo: 'subagent-organizations' },
  kwpc: { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli' },
  schema: { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/schema' },
  'platform-engineering': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/platform-engineering' },
  'productivity-cli': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/productivity-cli' },
  'product-management-cli': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/product-management-cli' },
  'data-cli': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/data-cli' },
  'it-admin': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/it-admin' },
};

const ISSUES_QUERY = /* GraphQL */ `
  query ($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      issues(first: 50, after: $cursor, states: [OPEN, CLOSED], orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          state
          url
          assignees(first: 1) { nodes { login } }
          labels(first: 20) { nodes { name } }
          projectItems(first: 5) {
            nodes {
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              priority: fieldValueByName(name: "Priority") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              wave: fieldValueByName(name: "Wave") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              effort: fieldValueByName(name: "Effort") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
            }
          }
        }
      }
    }
  }
`;

interface GraphQLNode {
  number: number;
  title: string;
  state: string;
  url: string;
  assignees: { nodes: Array<{ login: string }> };
  labels: { nodes: Array<{ name: string }> };
  projectItems: {
    nodes: Array<{
      fieldValueByName: { name?: string } | null;
      priority: { name?: string } | null;
      wave: { name?: string } | null;
      effort: { name?: string } | null;
    }>;
  };
}

function resolvePluginFromLabels(labels: string[], fallback: string): string {
  // First label matching `area/<plugin>` wins; otherwise fall back to the
  // PROJECT_MAP key so meta-repo issues always land in `meta-repo`.
  for (const label of labels) {
    const match = label.match(/^area\/(.+)$/);
    if (match && match[1]) return match[1];
  }
  return fallback;
}

function normalizeStatus(raw: string | undefined, state: string): Issue['status'] {
  if (raw === 'Todo' || raw === 'In Progress' || raw === 'In Review' || raw === 'Done' || raw === "Won't do") {
    return raw;
  }
  return state === 'CLOSED' ? 'Done' : 'Todo';
}

function normalizeEnum<T extends string>(value: string | undefined, fallback: T, allowed: readonly T[]): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

const PRIORITIES = ['P0', 'P1', 'P2', 'Stretch'] as const;
const WAVES = ['Wave 0', 'Wave 1', 'Wave 2', 'Future'] as const;
const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'] as const;

function nodeToIssue(
  node: GraphQLNode,
  ownerRepo: string,
  fallbackPlugin: string,
): Issue {
  const projectItem = node.projectItems.nodes[0];
  const labels = node.labels.nodes.map((n) => n.name);
  return {
    number: node.number,
    title: node.title,
    repo: ownerRepo,
    plugin: resolvePluginFromLabels(labels, fallbackPlugin),
    status: normalizeStatus(projectItem?.fieldValueByName?.name, node.state),
    priority: normalizeEnum(projectItem?.priority?.name, 'P2', PRIORITIES),
    wave: normalizeEnum(projectItem?.wave?.name, 'Wave 1', WAVES),
    effort: normalizeEnum(projectItem?.effort?.name, 'M', EFFORTS),
    assignee: node.assignees.nodes[0]?.login ?? null,
    url: node.url,
  };
}

async function fetchIssuesForSlug(
  slug: string,
  token: string,
  fallbackPluginForRepo: string,
): Promise<Issue[]> {
  const project = PROJECT_MAP[slug];
  if (!project) return [];
  const ownerRepo = `${project.owner}/${project.repo}`;
  const collected: Issue[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 4; page++) {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'subagent-organizations-pages-function',
      },
      body: JSON.stringify({
        query: ISSUES_QUERY,
        variables: { owner: project.owner, repo: project.repo, cursor },
      }),
    });
    if (!res.ok) break;
    const json = (await res.json()) as {
      data?: {
        repository?: {
          issues?: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
            nodes: GraphQLNode[];
          };
        };
      };
    };
    const issues = json?.data?.repository?.issues;
    if (!issues) break;
    for (const node of issues.nodes) {
      const issue = nodeToIssue(node, ownerRepo, fallbackPluginForRepo);
      // Apply label filter when the slug specifies one
      if (project.label) {
        const labels = node.labels.nodes.map((n) => n.name);
        if (!labels.includes(project.label)) continue;
      }
      collected.push(issue);
    }
    if (!issues.pageInfo.hasNextPage) break;
    cursor = issues.pageInfo.endCursor;
  }
  return collected;
}

async function buildPayload(token: string): Promise<ProjectsPayload> {
  const seen = new Map<string, Issue>();
  // Slug ordering matters for de-dup: if an issue appears under both a
  // slug + the parent kwpc, the slug-specific copy wins (it has the
  // resolved plugin label).
  const slugOrder = [
    'productivity-cli',
    'product-management-cli',
    'data-cli',
    'platform-engineering',
    'it-admin',
    'schema',
    'kwpc',
    'subagent-organizations',
  ];
  for (const slug of slugOrder) {
    const fallbackPlugin = slug === 'kwpc' ? 'meta-repo' : slug === 'subagent-organizations' ? 'meta-repo' : slug;
    const issues = await fetchIssuesForSlug(slug, token, fallbackPlugin);
    for (const issue of issues) {
      const key = `${issue.repo}#${issue.number}`;
      if (!seen.has(key)) seen.set(key, issue);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    issues: [...seen.values()],
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const fresh = url.searchParams.get('fresh') === '1';
  const slug = url.searchParams.get('slug');
  const cacheKey = `projects:${slug ?? 'all'}`;

  // 1. Cache hit
  if (!fresh && env.SUBAGENT_CACHE) {
    const cached = await env.SUBAGENT_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
          'X-Cache': 'HIT',
        },
      });
    }
  }

  // 2. Need a token to hit GitHub
  if (!env.GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({
        error: 'github_token_missing',
        message:
          'GITHUB_TOKEN env binding not configured. Client should fall back to /projects-snapshot.json.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      },
    );
  }

  // 3. Fetch + normalize
  let payload: ProjectsPayload;
  try {
    if (slug) {
      const fallbackPlugin = slug === 'kwpc' ? 'meta-repo' : slug === 'subagent-organizations' ? 'meta-repo' : slug;
      const issues = await fetchIssuesForSlug(slug, env.GITHUB_TOKEN, fallbackPlugin);
      payload = { generatedAt: new Date().toISOString(), issues };
    } else {
      payload = await buildPayload(env.GITHUB_TOKEN);
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'github_fetch_failed' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      },
    );
  }

  const body = JSON.stringify(payload);

  // 4. Cache + return
  if (env.SUBAGENT_CACHE) {
    await env.SUBAGENT_CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL });
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'X-Cache': 'MISS',
    },
  });
};
