/**
 * useProjects — snapshot-then-live React data hook for the dashboard.
 *
 * Spec: docs/spec/frontend/live-data.md § React data layer
 *
 * Behavior:
 *   1. Sync read of `/projects-snapshot.json` (build-time fixture) so the
 *      dashboard renders before `/api/projects` resolves
 *   2. Async fetch of `/api/projects` with stale-while-revalidate; on
 *      success, swap in the live data with no flicker (same shape)
 *   3. URL sync: `?slug=<plugin>` controls a derived selection state
 *      that callers can read for filtering
 *   4. 30s background refetch when the tab is focused
 *   5. If `/api/projects` returns 5xx OR 503-with-typed-fallback-error,
 *      stay on the snapshot. The dashboard NEVER breaks on a missing
 *      GITHUB_TOKEN.
 *
 * The hook returns a stable shape so consumers don't need to handle a
 * loading flag — they always see a populated `issues` array (empty
 * only when both snapshot AND API failed, which means something is
 * genuinely wrong with the deploy).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Issue, Plugin, ProjectsSnapshot } from '../types/Issue';
import { listIssues } from '../lib/projectsFetcher';

const API_URL = '/api/projects';
const REFRESH_MS = 30_000;

export type DataSource = 'snapshot' | 'api' | 'none';

export interface UseProjectsResult {
  /** Always populated post-mount; empty only when both layers failed. */
  issues: Issue[];
  /** Where the current `issues` array came from. */
  source: DataSource;
  /** Currently-selected plugin from `?slug=…`, or null when no filter. */
  selectedSlug: Plugin | null;
  /** Update the URL `?slug=` param + the derived selection. */
  setSelectedSlug: (slug: Plugin | null) => void;
  /** Manual refetch (e.g. for a "refresh" button). */
  refresh: () => void;
}

function readSlugFromUrl(): Plugin | null {
  if (typeof window === 'undefined') return null;
  const slug = new URLSearchParams(window.location.search).get('slug');
  return (slug as Plugin) ?? null;
}

async function fetchApi(): Promise<Issue[] | null> {
  try {
    const res = await fetch(API_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as ProjectsSnapshot | { error: string };
    if ('error' in json) return null;
    if (!Array.isArray(json.issues)) return null;
    return json.issues;
  } catch {
    return null;
  }
}

export function useProjects(): UseProjectsResult {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [source, setSource] = useState<DataSource>('none');
  const [selectedSlug, setSelectedSlugState] = useState<Plugin | null>(
    () => readSlugFromUrl(),
  );
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryApi = useCallback(async () => {
    const live = await fetchApi();
    if (live !== null) {
      setIssues(live);
      setSource('api');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 1. Synchronous-feeling snapshot load
    listIssues().then((snap) => {
      if (cancelled) return;
      if (snap.length > 0) {
        setIssues(snap);
        setSource('snapshot');
      }
    });
    // 2. Live API kick-off (parallel — whichever finishes last "wins" if
    // it's the API)
    tryApi();
    return () => {
      cancelled = true;
    };
  }, [tryApi]);

  // 30s background refetch when tab focused
  useEffect(() => {
    function start() {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await tryApi();
        }
        start();
      }, REFRESH_MS);
    }
    start();
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [tryApi]);

  // URL sync: pop-state + setter
  useEffect(() => {
    const onPop = () => setSelectedSlugState(readSlugFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setSelectedSlug = useCallback((slug: Plugin | null) => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('slug', slug);
    else url.searchParams.delete('slug');
    window.history.replaceState({}, '', url.toString());
    setSelectedSlugState(slug);
  }, []);

  const refresh = useCallback(() => {
    void tryApi();
  }, [tryApi]);

  return { issues, source, selectedSlug, setSelectedSlug, refresh };
}
