/**
 * Dashboard — `/` live-artifact tracker route.
 *
 * Spec: docs/spec/frontend/live-data.md (data shape) +
 *       docs/spec/frontend/design-brief.md (kanban + filter + Field).
 *
 * PR D: swapped from listIssues() (static fixture) to useProjects()
 * (snapshot-then-live). The component itself is unchanged below the
 * data layer — useProjects exposes the same Issue[] shape, plus a
 * `source` indicator for the small "live"/"snapshot" badge near the
 * heading so the user knows whether they're looking at cached or
 * live data.
 */

import { useMemo } from 'react';
import type { Issue, Plugin } from '../types/Issue';
import { PLUGINS } from '../types/Issue';
import { useProjects } from '../hooks/useProjects';
import { Field } from '../components/Field/Field';
import { KanbanGrid } from '../components/KanbanGrid/KanbanGrid';
import { PluginFilter } from '../components/PluginFilter/PluginFilter';
import sharedStyles from './shared.module.css';
import dashStyles from './Dashboard.module.css';

const ZERO_COUNTS: Readonly<Record<Plugin, number>> = Object.freeze(
  Object.fromEntries(PLUGINS.map((p) => [p, 0])) as Record<Plugin, number>,
);

function countByPlugin(issues: Issue[]): Record<Plugin, number> {
  const counts: Record<Plugin, number> = { ...ZERO_COUNTS };
  for (const issue of issues) counts[issue.plugin] += 1;
  return counts;
}

export function Dashboard() {
  const { issues, source, selectedSlug, setSelectedSlug } = useProjects();

  // PluginFilter still works in multi-select mode internally; the URL-
  // synced single-slug from useProjects is a higher-priority filter
  // when set. We render the multi-select behavior, but if `?slug=` is
  // in the URL, default the filter to that slug.
  const selected = useMemo<Set<Plugin>>(() => {
    if (selectedSlug) return new Set([selectedSlug]);
    return new Set();
  }, [selectedSlug]);

  const counts = useMemo(
    () => (issues.length > 0 ? countByPlugin(issues) : ZERO_COUNTS),
    [issues],
  );

  const filtered = useMemo(() => {
    if (selected.size === 0) return issues;
    return issues.filter((i) => selected.has(i.plugin));
  }, [issues, selected]);

  function handleFilterChange(next: Set<Plugin>) {
    if (next.size === 0) setSelectedSlug(null);
    else if (next.size === 1) {
      const first = [...next][0];
      setSelectedSlug(first ?? null);
    }
    // Multi-select with size > 1: clear the URL slug; user is expanding
    // beyond a single-plugin deep link, the URL goes back to "all".
    else setSelectedSlug(null);
  }

  return (
    <>
      <Field />
      <section className={dashStyles.section}>
        <header className={dashStyles.heading}>
          <h1 className={sharedStyles.title}>Dashboard</h1>
          <p className={dashStyles.subtitle}>
            Live tracker for the <code>subagentapps</code> polyrepo.{' '}
            <DataSourceBadge source={source} />
          </p>
        </header>
        {issues.length === 0 && source === 'none' ? (
          <p className={dashStyles.subtitle}>Loading…</p>
        ) : issues.length === 0 ? (
          <div className={sharedStyles.placeholder}>
            No issues — add some via Project #2.
          </div>
        ) : (
          <>
            <PluginFilter
              selected={selected}
              onChange={handleFilterChange}
              counts={counts}
            />
            <KanbanGrid issues={filtered} />
          </>
        )}
      </section>
    </>
  );
}

function DataSourceBadge({ source }: { source: 'snapshot' | 'api' | 'none' }) {
  if (source === 'none') return null;
  const label = source === 'api' ? 'live' : 'snapshot';
  const title =
    source === 'api'
      ? 'Showing live data from /api/projects (5-min KV cache)'
      : 'Showing build-time snapshot — /api/projects unavailable';
  return (
    <span className={dashStyles.dataBadge} title={title}>
      {label}
    </span>
  );
}
