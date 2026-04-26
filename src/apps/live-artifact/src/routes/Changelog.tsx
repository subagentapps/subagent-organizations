/**
 * Changelog — `/changelog` combined release history across plugins.
 *
 * Spec: docs/spec/frontend/content-routes.md § Changelog merge
 *
 * PR B: reads from the static fixture, merged + sorted reverse-chrono.
 * Each entry tagged with the source plugin as a chip per spec. PR E
 * swaps to live `/api/github-file` fetches against each plugin's
 * `CHANGELOG.md` (release-please-managed).
 */

import { useEffect, useState } from 'react';
import type { ChangelogEntry } from '../lib/contentFetcher';
import { listChangelogEntries } from '../lib/contentFetcher';
import { MarkdownBody } from '../components/MarkdownBody/MarkdownBody';
import { Chip, type ChipTone } from '../components/Chip/Chip';
import sharedStyles from './shared.module.css';
import logStyles from './Changelog.module.css';

function pluginToTone(plugin: string): ChipTone {
  const known: Record<string, ChipTone> = {
    'productivity-cli': 'plugin-productivity-cli',
    'product-management-cli': 'plugin-product-management-cli',
    'data-cli': 'plugin-data-cli',
    'platform-engineering': 'plugin-platform-engineering',
    'it-admin': 'plugin-it-admin',
    'engineering-cli': 'plugin-engineering-cli',
    schema: 'plugin-schema',
    'meta-repo': 'plugin-meta-repo',
  };
  return known[plugin] ?? 'neutral';
}

export function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);

  useEffect(() => {
    listChangelogEntries().then(setEntries);
  }, []);

  if (entries === null) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>Changelog</h1>
        <p className={sharedStyles.subtitle}>Loading…</p>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>Changelog</h1>
        <div className={sharedStyles.placeholder}>
          No releases yet. release-please publishes to each plugin&apos;s{' '}
          <code>CHANGELOG.md</code> on tag.
        </div>
      </section>
    );
  }

  return (
    <section className={sharedStyles.section}>
      <h1 className={sharedStyles.title}>Changelog</h1>
      <p className={sharedStyles.subtitle}>
        Combined release history across all plugins, reverse-chronological.
      </p>
      <ol className={logStyles.list}>
        {entries.map((entry) => (
          <li
            key={`${entry.plugin}-${entry.version}`}
            className={logStyles.item}
          >
            <header className={logStyles.itemHeader}>
              <span className={logStyles.itemVersion}>v{entry.version}</span>
              <Chip size="sm" tone={pluginToTone(entry.plugin)}>
                {entry.plugin}
              </Chip>
              <time className={logStyles.itemDate} dateTime={entry.date}>
                {entry.date}
              </time>
            </header>
            <MarkdownBody source={entry.body} skipCrossLinks />
          </li>
        ))}
      </ol>
    </section>
  );
}
