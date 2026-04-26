/**
 * GET /api/github-file — fetch a single file from a GitHub repo.
 *
 * Spec: docs/spec/frontend/content-routes.md § Required Pages Function: /api/github-file
 *
 * Query params:
 *   owner, repo, path (URL-encoded), ref (optional, defaults to default branch)
 *
 * Response: `{ content: string, sha: string, encoding: 'utf-8' }`
 *
 * Cache key: `gh-file:<owner>:<repo>:<path>:<ref>` in SUBAGENT_CACHE.
 * TTL: 300s (shared with /api/projects).
 *
 * Failure modes (fail-soft):
 *   - Missing GITHUB_TOKEN  → 503 with typed error body
 *   - Missing required param → 400
 *   - GitHub 404 (file/repo not found) → forward 404 with empty body
 *   - GitHub 5xx / network throw → 503 with typed error body
 *
 * Client (`src/lib/githubFile.ts`) treats 503 as "fall back to fixture
 * content" — the dashboard never breaks on a missing token.
 *
 * REST endpoint chosen over GraphQL because raw-file fetches are
 * cheaper that way (single round-trip, content already base64-encoded
 * in the response).
 */

interface Env {
  GITHUB_TOKEN?: string;
  SUBAGENT_CACHE?: KVNamespace;
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

const CACHE_TTL = 300;
const GITHUB_REST = 'https://api.github.com';

/** Whitelist of repos this Function may proxy. Prevents abuse. */
const ALLOWED_OWNERS = new Set(['subagentapps']);

interface GitHubContentsResponse {
  content?: string;
  encoding?: string;
  sha?: string;
  type?: string;
}

interface FilePayload {
  content: string;
  sha: string;
  encoding: 'utf-8';
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');
  const path = url.searchParams.get('path');
  const ref = url.searchParams.get('ref') ?? '';
  const fresh = url.searchParams.get('fresh') === '1';

  if (!owner || !repo || !path) {
    return jsonResponse(
      { error: 'missing_params', message: 'owner, repo, path required' },
      400,
    );
  }

  if (!ALLOWED_OWNERS.has(owner)) {
    return jsonResponse(
      { error: 'owner_not_allowed', message: `owner '${owner}' is not whitelisted` },
      403,
    );
  }

  const cacheKey = `gh-file:${owner}:${repo}:${path}:${ref || 'default'}`;

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

  // 2. Need a token
  if (!env.GITHUB_TOKEN) {
    return jsonResponse(
      {
        error: 'github_token_missing',
        message:
          'GITHUB_TOKEN env binding not configured. Client should fall back to bundled fixture.',
      },
      503,
      { 'X-Cache': 'MISS' },
    );
  }

  // 3. REST fetch
  const restUrl = new URL(`${GITHUB_REST}/repos/${owner}/${repo}/contents/${path}`);
  if (ref) restUrl.searchParams.set('ref', ref);

  let payload: FilePayload;
  try {
    const res = await fetch(restUrl.toString(), {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'subagent-organizations-pages-function',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.status === 404) {
      return jsonResponse(
        { error: 'file_not_found', message: `${owner}/${repo}:${path}` },
        404,
        { 'X-Cache': 'MISS' },
      );
    }
    if (!res.ok) {
      return jsonResponse(
        { error: 'github_fetch_failed', message: `HTTP ${res.status}` },
        503,
        { 'X-Cache': 'MISS' },
      );
    }
    const json = (await res.json()) as GitHubContentsResponse;
    if (json.type !== 'file' || !json.content || !json.sha) {
      return jsonResponse(
        { error: 'unexpected_response', message: 'expected a single file' },
        503,
        { 'X-Cache': 'MISS' },
      );
    }
    // GitHub returns base64-encoded content (with embedded newlines we strip)
    const decoded = atob(json.content.replace(/\n/g, ''));
    payload = { content: decoded, sha: json.sha, encoding: 'utf-8' };
  } catch {
    return jsonResponse(
      { error: 'github_fetch_failed', message: 'network or parse error' },
      503,
      { 'X-Cache': 'MISS' },
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
