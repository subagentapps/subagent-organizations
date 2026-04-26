/**
 * IssueCard — single issue row in a status column.
 *
 * Spec: design-brief.md says "title, repo / issue number, plugin chip,
 * priority chip, wave chip, effort chip, optional assignee. ~80px tall."
 */

import { ExternalLink } from 'lucide-react';
import type { Issue } from '../../types/Issue';
import { Chip, type ChipTone } from '../Chip/Chip';
import styles from './IssueCard.module.css';

const PLUGIN_TONE: Record<Issue['plugin'], ChipTone> = {
  'productivity-cli': 'plugin-productivity-cli',
  'product-management-cli': 'plugin-product-management-cli',
  'data-cli': 'plugin-data-cli',
  'platform-engineering': 'plugin-platform-engineering',
  'it-admin': 'plugin-it-admin',
  'engineering-cli': 'plugin-engineering-cli',
  schema: 'plugin-schema',
  'meta-repo': 'plugin-meta-repo',
};

const PRIORITY_TONE: Record<Issue['priority'], ChipTone> = {
  P0: 'priority-p0',
  P1: 'priority-p1',
  P2: 'priority-p2',
  Stretch: 'priority-stretch',
};

export interface IssueCardProps {
  issue: Issue;
}

export function IssueCard({ issue }: IssueCardProps) {
  // Show repo as just the repo name (drop org prefix) for terseness
  const repoShort = issue.repo.split('/').pop() ?? issue.repo;
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <a
          href={issue.url}
          className={styles.titleLink}
          target="_blank"
          rel="noreferrer"
        >
          <h3 className={styles.title}>{issue.title}</h3>
          <ExternalLink size={14} className={styles.titleIcon} aria-hidden />
        </a>
      </header>
      <div className={styles.refLine}>
        <span className={styles.refRepo}>{repoShort}</span>
        <span className={styles.refSeparator}>/</span>
        <span className={styles.refNumber}>#{issue.number}</span>
      </div>
      <div className={styles.chips}>
        <Chip size="sm" tone={PLUGIN_TONE[issue.plugin]}>
          {issue.plugin}
        </Chip>
        <Chip size="sm" tone={PRIORITY_TONE[issue.priority]}>
          {issue.priority}
        </Chip>
        <Chip size="sm" tone="neutral">
          {issue.wave}
        </Chip>
        <Chip size="sm" tone="neutral">
          {issue.effort}
        </Chip>
      </div>
      {issue.assignee && (
        <div className={styles.assignee}>@{issue.assignee}</div>
      )}
    </article>
  );
}
