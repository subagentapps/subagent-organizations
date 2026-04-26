/**
 * AdrIndex — `/adr` ADR index route.
 *
 * Spec: docs/spec/frontend/content-routes.md § ADR rendering rules
 *
 * PR B: lists ADRs from the static fixture, sorted ascending by 4-digit
 * number per spec. Each entry links to `/adr/:number`. PR E swaps in
 * live `/api/github-file` traversal across plugin docs/adr/* dirs.
 */

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { AdrEntry } from '../lib/contentFetcher';
import { listAdrs } from '../lib/contentFetcher';
import { Chip } from '../components/Chip/Chip';
import sharedStyles from './shared.module.css';
import indexStyles from './AdrIndex.module.css';

export function AdrIndex() {
  const [adrs, setAdrs] = useState<AdrEntry[] | null>(null);

  useEffect(() => {
    listAdrs().then(setAdrs);
  }, []);

  if (adrs === null) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>ADRs</h1>
        <p className={sharedStyles.subtitle}>Loading…</p>
      </section>
    );
  }

  if (adrs.length === 0) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>ADRs</h1>
        <div className={sharedStyles.placeholder}>
          No ADRs yet. Add files at <code>docs/adr/NNNN-title.md</code> in
          any plugin and they&apos;ll appear here.
        </div>
      </section>
    );
  }

  return (
    <section className={sharedStyles.section}>
      <h1 className={sharedStyles.title}>ADRs</h1>
      <p className={sharedStyles.subtitle}>
        Architecture Decision Records, indexed across all plugins.
      </p>
      <ul className={indexStyles.list}>
        {adrs.map((adr) => (
          <li key={`${adr.plugin}-${adr.number}`} className={indexStyles.item}>
            <Link href={`/adr/${adr.number}`} className={indexStyles.itemLink}>
              <span className={indexStyles.itemNumber}>{adr.number}</span>
              <span className={indexStyles.itemBody}>
                <span className={indexStyles.itemTitle}>{adr.title}</span>
                <span className={indexStyles.itemMeta}>
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
                  {adr.date && (
                    <span className={indexStyles.itemDate}>{adr.date}</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
