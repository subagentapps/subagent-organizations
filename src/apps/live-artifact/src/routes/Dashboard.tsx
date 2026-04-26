/**
 * Dashboard — `/` live-artifact tracker route.
 *
 * Spec: docs/spec/frontend/live-data.md (data shape) +
 *       docs/spec/frontend/design-brief.md (kanban + filter + Field).
 *
 * PR C: full kanban (StatusColumn × IssueCard × chips) wired against
 * the static `/projects-snapshot.json` fixture. PR D swaps to live
 * `/api/projects` via the useProjects hook without touching this file.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Issue, Plugin } from '../types/Issue';
import { PLUGINS } from '../types/Issue';
import { listIssues } from '../lib/projectsFetcher';
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
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [selected, setSelected] = useState<Set<Plugin>>(() => new Set());

  useEffect(() => {
    listIssues().then(setIssues);
  }, []);

  const counts = useMemo(
    () => (issues ? countByPlugin(issues) : ZERO_COUNTS),
    [issues],
  );

  const filtered = useMemo(() => {
    if (!issues) return [];
    if (selected.size === 0) return issues;
    return issues.filter((i) => selected.has(i.plugin));
  }, [issues, selected]);

  return (
    <>
      <Field />
      <section className={dashStyles.section}>
        <header className={dashStyles.heading}>
          <h1 className={sharedStyles.title}>Dashboard</h1>
          <p className={dashStyles.subtitle}>
            Live tracker for the <code>subagentapps</code> polyrepo.
          </p>
        </header>
        {issues === null ? (
          <p className={dashStyles.subtitle}>Loading…</p>
        ) : issues.length === 0 ? (
          <div className={sharedStyles.placeholder}>
            No issues — add some via Project #2.
          </div>
        ) : (
          <>
            <PluginFilter
              selected={selected}
              onChange={setSelected}
              counts={counts}
            />
            <KanbanGrid issues={filtered} />
          </>
        )}
      </section>
    </>
  );
}
