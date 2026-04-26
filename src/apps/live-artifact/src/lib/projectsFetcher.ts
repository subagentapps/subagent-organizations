/**
 * Projects fetcher with snapshot fallback.
 *
 * Spec: docs/spec/frontend/live-data.md
 *
 * PR C: reads from `/projects-snapshot.json` (build-time static asset).
 * PR D: adds the `useProjects` hook + `/api/projects` Pages Function;
 * the hook reads the snapshot synchronously for instant render, then
 * swaps in live data without flicker.
 *
 * The two-tier API matches the live-data.md "static-then-live" pattern.
 */

import type { Issue, ProjectsSnapshot } from '../types/Issue';

const SNAPSHOT_URL = '/projects-snapshot.json';

let cachedSnapshot: ProjectsSnapshot | null = null;
let snapshotPromise: Promise<ProjectsSnapshot | null> | null = null;

async function loadSnapshot(): Promise<ProjectsSnapshot | null> {
  if (cachedSnapshot !== null) return cachedSnapshot;
  if (snapshotPromise !== null) return snapshotPromise;
  snapshotPromise = fetch(SNAPSHOT_URL)
    .then((res) => (res.ok ? (res.json() as Promise<ProjectsSnapshot>) : null))
    .then((data) => {
      cachedSnapshot = data;
      return data;
    })
    .catch(() => {
      cachedSnapshot = null;
      return null;
    });
  return snapshotPromise;
}

/** Get the full set of issues (across all plugins). */
export async function listIssues(): Promise<Issue[]> {
  const snap = await loadSnapshot();
  if (!snap) return [];
  return snap.issues;
}

/** Test-only cache reset. */
export function __resetSnapshotCacheForTests(): void {
  cachedSnapshot = null;
  snapshotPromise = null;
}
