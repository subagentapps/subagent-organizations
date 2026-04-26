/**
 * AdrIndex — `/adr` ADR index route.
 *
 * Spec: docs/spec/frontend/content-routes.md § ADR rendering rules
 *
 * STUB: PR A renders the page shell + a placeholder. PR B adds the
 * actual index parsing docs/adr/*.md from each plugin.
 */

import styles from './shared.module.css';

export function AdrIndex() {
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>ADRs</h1>
      <p className={styles.subtitle}>
        Architecture Decision Records, indexed across all plugins.
      </p>
      <div className={styles.placeholder}>
        ADR index — landing in PR B (markdown rendering + index walker).
      </div>
    </section>
  );
}
