/**
 * issueCounts — shared tally helpers for Dashboard + PluginsIndex.
 *
 * Both routes need to know "how many open issues per plugin" — Dashboard
 * uses it for the PluginFilter chip badges, PluginsIndex uses it for the
 * tile count. Extracted here so the two routes can't drift on the
 * counting rule (e.g., one starts excluding "Won't do" while the other
 * doesn't).
 *
 * Spec: docs/spec/frontend/live-data.md (Issue + Plugin types live there).
 */

import type { Issue, Plugin } from '../types/Issue';
import { PLUGINS } from '../types/Issue';

/**
 * Frozen zero-counts record — every plugin maps to 0. Use as the seed
 * for `countByPlugin` and as a sentinel when no issues are loaded yet.
 *
 * Frozen so accidental mutation (`emptyPluginCounts['foo'] = 1`) throws
 * in strict mode rather than silently corrupting the shared default.
 */
export const emptyPluginCounts: Readonly<Record<Plugin, number>> = Object.freeze(
  Object.fromEntries(PLUGINS.map((p) => [p, 0])) as Record<Plugin, number>,
);

/**
 * Count issues per plugin. Returns a fresh object — caller may mutate
 * freely without affecting the seed.
 *
 * Includes ALL statuses (Todo, In Progress, In Review, Done, Won't do).
 * If a route needs an open-only count, filter the issues array first:
 *
 *   countByPlugin(issues.filter((i) => i.status !== "Won't do"))
 */
export function countByPlugin(issues: Issue[]): Record<Plugin, number> {
  const counts: Record<Plugin, number> = { ...emptyPluginCounts };
  for (const issue of issues) {
    counts[issue.plugin] += 1;
  }
  return counts;
}
