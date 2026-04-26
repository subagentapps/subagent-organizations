/**
 * Dashboard — the live-artifact tracker route.
 *
 * Spec: docs/spec/frontend/live-data.md (data shape)
 *      + docs/spec/frontend/design-brief.md (kanban + chips + layout)
 *
 * STUB: PR A renders a placeholder + the <Field /> backdrop. The actual
 * kanban (StatusColumn × IssueCard × chips) lands in PR C alongside the
 * useProjects hook (PR D) wiring it to /api/projects.
 */

import { Field } from '../components/Field/Field';
import styles from './Dashboard.module.css';

export function Dashboard() {
  return (
    <>
      <Field />
      <section className={styles.section}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Live tracker for the <code>subagentapps</code> polyrepo.
        </p>
        <div className={styles.placeholder}>
          <p>
            Kanban grouped by Project Status × Plugin filter — landing in
            the next PR.
          </p>
          <p className={styles.placeholderMeta}>
            See <code>docs/spec/frontend/live-data.md</code> for the data
            shape and <code>docs/spec/frontend/design-brief.md</code> for
            the layout.
          </p>
        </div>
      </section>
    </>
  );
}
