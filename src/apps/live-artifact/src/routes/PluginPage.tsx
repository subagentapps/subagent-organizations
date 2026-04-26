/**
 * PluginPage — `/plugins/:name` per-plugin landing page.
 *
 * Spec: docs/spec/frontend/content-routes.md
 *
 * STUB: PR A renders the page shell + plugin name. PR E adds README
 * fetch via /api/github-file + recent-issues list.
 */

import { useRoute } from 'wouter';
import { useLocation } from 'wouter';
import styles from './PluginPage.module.css';

const KNOWN_PLUGINS = new Set([
  'productivity-cli',
  'product-management-cli',
  'data-cli',
  'platform-engineering',
  'it-admin',
  'engineering-cli',
  'schema',
  'meta-repo',
]);

export function PluginPage() {
  const [, params] = useRoute<{ name: string }>('/plugins/:name');
  const [, navigate] = useLocation();
  const name = params?.name ?? '';
  const known = KNOWN_PLUGINS.has(name);

  if (!known) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Plugin not found</h1>
        <p className={styles.subtitle}>
          <code>{name}</code> isn&apos;t a recognized plugin.
        </p>
        <button onClick={() => navigate('/')} className={styles.backLink}>
          Back to dashboard
        </button>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>
        <code>{name}</code>
      </h1>
      <p className={styles.subtitle}>Per-plugin landing page.</p>
      <div className={styles.placeholder}>
        README excerpt + recent issues — landing in PR E.
      </div>
    </section>
  );
}
