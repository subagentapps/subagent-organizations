/**
 * KanbanGrid — flex container for the 5 status columns.
 *
 * Spec: design-brief.md kanban layout. Mobile breakpoint at 768px:
 * vertical scroll-snap so each column takes the viewport width.
 */

import type { Issue } from '../../types/Issue';
import { STATUSES } from '../../types/Issue';
import { StatusColumn } from '../StatusColumn/StatusColumn';
import styles from './KanbanGrid.module.css';

export interface KanbanGridProps {
  issues: Issue[];
}

export function KanbanGrid({ issues }: KanbanGridProps) {
  return (
    <div className={styles.grid} role="region" aria-label="Issue kanban">
      {STATUSES.map((status) => {
        const statusIssues = issues.filter((i) => i.status === status);
        return (
          <StatusColumn
            key={status}
            status={status}
            issues={statusIssues}
            defaultCollapsed={status === "Won't do"}
          />
        );
      })}
    </div>
  );
}
