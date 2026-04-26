/**
 * StatusColumn — one column of the kanban grid for a single Status.
 *
 * Spec: design-brief.md says "Status column: Todo, In Progress, In Review,
 * Done, Won't do (4 visible by default; Won't do collapses)."
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Issue, Status } from '../../types/Issue';
import { IssueCard } from '../IssueCard/IssueCard';
import styles from './StatusColumn.module.css';

export interface StatusColumnProps {
  status: Status;
  issues: Issue[];
  /** When true, the column collapses by default (Won't do uses this). */
  defaultCollapsed?: boolean;
}

export function StatusColumn({
  status,
  issues,
  defaultCollapsed = false,
}: StatusColumnProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const count = issues.length;

  return (
    <section className={styles.column} aria-labelledby={`status-${status}`}>
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={styles.toggle}
          aria-expanded={!collapsed}
          aria-controls={`status-list-${status}`}
        >
          {collapsed ? (
            <ChevronRight size={14} aria-hidden />
          ) : (
            <ChevronDown size={14} aria-hidden />
          )}
          <span id={`status-${status}`} className={styles.title}>
            {status}
          </span>
          <span className={styles.count}>{count}</span>
        </button>
      </header>
      {!collapsed && (
        <div
          id={`status-list-${status}`}
          className={styles.list}
          role="list"
        >
          {issues.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            issues.map((issue) => (
              <div key={`${issue.repo}-${issue.number}`} role="listitem">
                <IssueCard issue={issue} />
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
