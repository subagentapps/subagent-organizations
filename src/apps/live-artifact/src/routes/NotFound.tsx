/**
 * NotFound — fallback 404 route.
 *
 * Spec: docs/spec/frontend/content-routes.md
 */

import { useLocation } from 'wouter';
import styles from './shared.module.css';

export function NotFound() {
  const [, navigate] = useLocation();
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.subtitle}>
        That route doesn&apos;t exist.
      </p>
      <button onClick={() => navigate('/')} className={styles.backLink}>
        Back to dashboard
      </button>
    </section>
  );
}
