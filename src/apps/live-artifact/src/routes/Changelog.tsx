/**
 * Changelog — `/changelog` combined changelog across all plugins.
 *
 * Spec: docs/spec/frontend/content-routes.md § Changelog merge
 *
 * STUB: PR A renders the page shell. PR B adds the merge logic +
 * per-plugin chips on each entry.
 */

import styles from './shared.module.css';

export function Changelog() {
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Changelog</h1>
      <p className={styles.subtitle}>
        Combined release history across all plugins, reverse-chrono.
      </p>
      <div className={styles.placeholder}>
        Changelog merge — landing in PR B (alongside MarkdownBody).
      </div>
    </section>
  );
}
