#!/usr/bin/env bun
/**
 * Build-time snapshot generator.
 *
 * Spec: docs/spec/frontend/live-data.md § Build-time static fallback
 *
 * Runs in CI before `bun run build`, queries the same GraphQL shape as
 * `/api/projects`, writes `public/projects-snapshot.json`. The React
 * app reads that synchronously at boot so the page renders before
 * `/api/projects` resolves.
 *
 * Fail-soft: if GITHUB_TOKEN isn't set, leaves the existing snapshot
 * intact and exits 0 with a stderr warning. CI builds still succeed
 * (we deploy with the bundled fixture).
 *
 * Usage:
 *   GITHUB_TOKEN=<pat> bun run snapshot:projects
 *
 * Or in package.json scripts: `"prebuild": "bun run scripts/snapshot-projects.ts"`
 */

import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(HERE, '..', 'public', 'projects-snapshot.json');

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

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

const PRIORITIES = ['P0', 'P1', 'P2', 'Stretch'] as const;
const WAVES = ['Wave 0', 'Wave 1', 'Wave 2', 'Future'] as const;
const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'] as const;

function resolvePluginFromLabels(labels: string[], fallback: string): string {
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

function nodeToIssue(node: GraphQLNode, ownerRepo: string, fallbackPlugin: string): Issue {
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
        'User-Agent': 'subagent-organizations-snapshot-script',
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

async function main(): Promise<void> {
  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    process.stderr.write(
      'snapshot-projects: GITHUB_TOKEN not set — leaving existing snapshot in place\n',
    );
    if (!existsSync(SNAPSHOT_PATH)) {
      process.stderr.write(
        `snapshot-projects: ${SNAPSHOT_PATH} does not exist; build will use empty snapshot\n`,
      );
    }
    return;
  }

  const seen = new Map<string, Issue>();
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
    const fallbackPlugin =
      slug === 'kwpc' || slug === 'subagent-organizations' ? 'meta-repo' : slug;
    let issues: Issue[];
    try {
      issues = await fetchIssuesForSlug(slug, token, fallbackPlugin);
    } catch (e) {
      process.stderr.write(`snapshot-projects: ${slug} fetch failed: ${e}\n`);
      continue;
    }
    for (const issue of issues) {
      const key = `${issue.repo}#${issue.number}`;
      if (!seen.has(key)) seen.set(key, issue);
    }
    process.stdout.write(`snapshot-projects: ${slug} → ${issues.length} issues\n`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    issues: [...seen.values()],
  };

  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(
    `snapshot-projects: wrote ${payload.issues.length} issues to ${SNAPSHOT_PATH}\n`,
  );
}

if (import.meta.main) {
  main().catch((e) => {
    process.stderr.write(`snapshot-projects: ${e}\n`);
    process.exit(1);
  });
}
