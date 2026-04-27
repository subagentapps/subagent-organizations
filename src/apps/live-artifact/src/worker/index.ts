/**
 * Worker entry — dispatches /api/* to the existing handlers, lets static
 * assets serve everything else.
 *
 * This file replaces Cloudflare Pages Functions auto-discovery with a
 * single explicit fetch() handler. The handler bodies in
 * `functions/api/*.ts` are reused unchanged — just wrapped to translate
 * the Worker `(request, env, ctx)` shape into the Pages Function
 * `({ request, env, params })` shape that those modules already expect.
 *
 * Per docs/spec/frontend/cloudflare-pages.md (now superseded by the
 * Workers-Static-Assets migration brief at installs/briefs/2026-04-26-
 * workers-migration.md), the asset binding serves dist/ verbatim and
 * `not_found_handling: "single-page-application"` returns index.html
 * for any unmatched path so wouter can take over client-side routing.
 *
 * Citations:
 *   https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
 *   https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
 */

import { onRequestGet as projectsHandler } from '../../functions/api/projects';
import { onRequestGet as githubFileHandler } from '../../functions/api/github-file';

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface WorkerKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  ASSETS: AssetFetcher;
  GITHUB_TOKEN?: string;
  SUBAGENT_CACHE?: WorkerKVNamespace;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Translate Worker ctx to the Pages Function ctx the handlers expect.
    const pagesCtx = { request, env, params: {} } as unknown as Parameters<typeof projectsHandler>[0];

    if (url.pathname === '/api/projects') {
      return projectsHandler(pagesCtx);
    }
    if (url.pathname === '/api/github-file') {
      return githubFileHandler(pagesCtx);
    }

    // Anything else — let the static-assets binding serve it (including
    // SPA fallback to index.html for unmatched paths).
    return env.ASSETS.fetch(request);
  },
};
