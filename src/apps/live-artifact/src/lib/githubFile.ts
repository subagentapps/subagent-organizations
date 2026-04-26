/**
 * Client wrapper for /api/github-file.
 *
 * Spec: docs/spec/frontend/content-routes.md § Required Pages Function
 *
 * Fail-soft: returns null on 5xx or network failure so the calling
 * route can fall back to fixture content. Distinguishes 404 ("file
 * doesn't exist") from 503 ("API unavailable") so callers can decide
 * whether to retry vs render-empty.
 */

const API = '/api/github-file';

export interface GitHubFile {
  content: string;
  sha: string;
}

export type GitHubFileError =
  | { kind: 'not-found' }       // 404 — the file genuinely doesn't exist
  | { kind: 'unavailable' }     // 503 — API down or token missing; client should fall back
  | { kind: 'bad-request' };    // 400 / 403 — caller bug or whitelist miss

export type GitHubFileResult =
  | { ok: true; file: GitHubFile }
  | { ok: false; error: GitHubFileError };

export async function fetchGitHubFile(args: {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<GitHubFileResult> {
  const url = new URL(API, window.location.origin);
  url.searchParams.set('owner', args.owner);
  url.searchParams.set('repo', args.repo);
  url.searchParams.set('path', args.path);
  if (args.ref) url.searchParams.set('ref', args.ref);
  try {
    const res = await fetch(url.toString());
    if (res.status === 404) return { ok: false, error: { kind: 'not-found' } };
    if (res.status === 400 || res.status === 403) {
      return { ok: false, error: { kind: 'bad-request' } };
    }
    if (!res.ok) return { ok: false, error: { kind: 'unavailable' } };
    const json = (await res.json()) as { content?: string; sha?: string };
    if (typeof json.content !== 'string' || typeof json.sha !== 'string') {
      return { ok: false, error: { kind: 'unavailable' } };
    }
    return { ok: true, file: { content: json.content, sha: json.sha } };
  } catch {
    return { ok: false, error: { kind: 'unavailable' } };
  }
}
