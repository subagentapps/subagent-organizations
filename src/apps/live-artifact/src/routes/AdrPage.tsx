/**
 * AdrPage — `/adr/:number` single ADR view.
 *
 * Spec: docs/spec/frontend/content-routes.md § ADR rendering rules
 *
 * PR B: reads from the static fixture; renders body via MarkdownBody
 * with cross-link rewriting (./0003-foo.md → /adr/0003) so navigation
 * stays inside the SPA. PR E swaps to live `/api/github-file` fetches.
 */

import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import type { AdrEntry } from '../lib/contentFetcher';
import { getAdr } from '../lib/contentFetcher';
import { MarkdownBody } from '../components/MarkdownBody/MarkdownBody';
import { Chip } from '../components/Chip/Chip';
import sharedStyles from './shared.module.css';
import pageStyles from './AdrPage.module.css';

export function AdrPage() {
  const [, params] = useRoute<{ number: string }>('/adr/:number');
  const number = params?.number ?? '';
  const [adr, setAdr] = useState<AdrEntry | null | undefined>(undefined);

  useEffect(() => {
    if (!number) return;
    setAdr(undefined);
    getAdr(number).then(setAdr);
  }, [number]);

  if (adr === undefined) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>
          ADR <code>{number}</code>
        </h1>
        <p className={sharedStyles.subtitle}>Loading…</p>
      </section>
    );
  }

  if (adr === null) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>ADR not found</h1>
        <p className={sharedStyles.subtitle}>
          No ADR with number <code>{number}</code>.
        </p>
        <Link href="/adr" className={sharedStyles.backLink}>
          ← Back to ADR index
        </Link>
      </section>
    );
  }

  return (
    <article className={pageStyles.article}>
      <header className={pageStyles.header}>
        <Link href="/adr" className={pageStyles.crumb}>
          ← ADR index
        </Link>
        <h1 className={pageStyles.title}>
          <span className={pageStyles.titleNumber}>{adr.number}</span>{' '}
          {adr.title}
        </h1>
        <div className={pageStyles.meta}>
          <Chip size="sm" tone="plugin-meta-repo">
            {adr.plugin}
          </Chip>
          {adr.status && (
            <Chip
              size="sm"
              tone={
                adr.status.toLowerCase() === 'accepted'
                  ? 'status-done'
                  : 'neutral'
              }
            >
              {adr.status}
            </Chip>
          )}
          {adr.date && <span className={pageStyles.metaDate}>{adr.date}</span>}
        </div>
      </header>
      <MarkdownBody source={adr.body} />
    </article>
  );
}
