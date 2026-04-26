/**
 * PluginPage — `/plugins/:name` per-plugin landing page.
 *
 * Spec: docs/spec/frontend/content-routes.md § PluginPage
 *      "Loads README + plugin.json + recent issues; renders shell + body"
 *
 * PR E: live README via /api/github-file + recent issues via useProjects.
 * Fail-soft: if the README fetch returns 503 (token missing) or 404
 * (path doesn't exist yet), shows a lightweight placeholder; recent
 * issues still render from the snapshot.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import type { Issue, Plugin } from '../types/Issue';
import { PLUGINS } from '../types/Issue';
import { PLUGIN_REGISTRY } from '../lib/pluginRegistry';
import { fetchGitHubFile, type GitHubFileError } from '../lib/githubFile';
import { useProjects } from '../hooks/useProjects';
import { MarkdownBody } from '../components/MarkdownBody/MarkdownBody';
import { IssueCard } from '../components/IssueCard/IssueCard';
import { Chip } from '../components/Chip/Chip';
import sharedStyles from './shared.module.css';
import pageStyles from './PluginPage.module.css';

const KNOWN: ReadonlySet<Plugin> = new Set(PLUGINS);

type ReadmeState =
  | { kind: 'loading' }
  | { kind: 'loaded'; markdown: string }
  | { kind: 'error'; error: GitHubFileError };

export function PluginPage() {
  const [, params] = useRoute<{ name: string }>('/plugins/:name');
  const [, navigate] = useLocation();
  const name = params?.name ?? '';
  const isKnown = KNOWN.has(name as Plugin);

  if (!isKnown) {
    return (
      <section className={sharedStyles.section}>
        <h1 className={sharedStyles.title}>Plugin not found</h1>
        <p className={sharedStyles.subtitle}>
          <code>{name}</code> isn&apos;t a recognized plugin.
        </p>
        <button
          onClick={() => navigate('/')}
          className={sharedStyles.backLink}
          type="button"
        >
          Back to dashboard
        </button>
      </section>
    );
  }

  return <KnownPluginPage slug={name as Plugin} />;
}

function KnownPluginPage({ slug }: { slug: Plugin }) {
  const info = PLUGIN_REGISTRY[slug];
  const [owner, repoName] = info.ownerRepo.split('/');
  const [readme, setReadme] = useState<ReadmeState>({ kind: 'loading' });
  const { issues, source } = useProjects();

  useEffect(() => {
    let cancelled = false;
    setReadme({ kind: 'loading' });
    fetchGitHubFile({
      owner: owner!,
      repo: repoName!,
      path: info.readmePath,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setReadme({ kind: 'loaded', markdown: result.file.content });
      } else {
        setReadme({ kind: 'error', error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [owner, repoName, info.readmePath]);

  const recentIssues: Issue[] = issues
    .filter((i) => i.plugin === slug)
    .slice(0, 6);

  return (
    <article className={pageStyles.article}>
      <header className={pageStyles.header}>
        <Link href="/" className={pageStyles.crumb}>
          ← Dashboard
        </Link>
        <h1 className={pageStyles.title}>
          <code>{info.label}</code>
        </h1>
        <div className={pageStyles.meta}>
          <Chip size="sm" tone="neutral">
            {info.ownerRepo}
          </Chip>
          <a
            className={pageStyles.repoLink}
            href={`https://github.com/${info.ownerRepo}`}
            target="_blank"
            rel="noreferrer"
          >
            github ↗
          </a>
        </div>
      </header>

      <section className={pageStyles.readme}>
        <h2 className={pageStyles.sectionTitle}>README</h2>
        {readme.kind === 'loading' && (
          <p className={sharedStyles.subtitle}>Loading…</p>
        )}
        {readme.kind === 'loaded' && (
          <MarkdownBody source={readme.markdown} skipCrossLinks />
        )}
        {readme.kind === 'error' && (
          <ReadmeFallback error={readme.error} info={info} />
        )}
      </section>

      <section className={pageStyles.issues}>
        <h2 className={pageStyles.sectionTitle}>
          Recent issues{' '}
          <span className={pageStyles.sectionMeta}>
            ({source === 'api' ? 'live' : 'snapshot'})
          </span>
        </h2>
        {recentIssues.length === 0 ? (
          <div className={sharedStyles.placeholder}>
            No issues for this plugin yet.
          </div>
        ) : (
          <ul className={pageStyles.issueList}>
            {recentIssues.map((issue) => (
              <li key={`${issue.repo}-${issue.number}`}>
                <IssueCard issue={issue} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function ReadmeFallback({
  error,
  info,
}: {
  error: GitHubFileError;
  info: { ownerRepo: string; readmePath: string };
}) {
  const reason =
    error.kind === 'not-found'
      ? `README not found at ${info.ownerRepo}:${info.readmePath}`
      : error.kind === 'unavailable'
        ? `/api/github-file unavailable (no GITHUB_TOKEN configured yet)`
        : 'Bad request';
  return (
    <div className={sharedStyles.placeholder}>
      <p>{reason}</p>
      <p className={pageStyles.fallbackHint}>
        View on GitHub:{' '}
        <a
          href={`https://github.com/${info.ownerRepo}/blob/main/${info.readmePath}`}
          target="_blank"
          rel="noreferrer"
        >
          {info.ownerRepo}/{info.readmePath}
        </a>
      </p>
    </div>
  );
}
