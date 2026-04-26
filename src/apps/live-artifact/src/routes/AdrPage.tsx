/**
 * AdrPage — `/adr/:number` single ADR view.
 *
 * Spec: docs/spec/frontend/content-routes.md § ADR rendering rules
 *
 * STUB: PR A renders the page shell. PR B adds MarkdownBody.
 */

import { useRoute } from 'wouter';
import styles from './shared.module.css';

export function AdrPage() {
  const [, params] = useRoute<{ number: string }>('/adr/:number');
  const number = params?.number ?? '';

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>
        ADR <code>{number}</code>
      </h1>
      <div className={styles.placeholder}>
        Markdown body — landing in PR B.
      </div>
    </section>
  );
}
