/**
 * Chip — 1px-outlined pill for plugin / status / priority labels.
 *
 * Spec: design-brief.md says "chip is a 1-px outlined pill, not filled."
 *
 * The `tone` prop maps to a CSS variable so the Chip can adopt any
 * design-token color without per-tone class explosion.
 */

import type { CSSProperties, ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipTone =
  | 'plugin-productivity-cli'
  | 'plugin-product-management-cli'
  | 'plugin-data-cli'
  | 'plugin-platform-engineering'
  | 'plugin-it-admin'
  | 'plugin-engineering-cli'
  | 'plugin-schema'
  | 'plugin-meta-repo'
  | 'status-todo'
  | 'status-in-progress'
  | 'status-in-review'
  | 'status-done'
  | 'status-wont-do'
  | 'priority-p0'
  | 'priority-p1'
  | 'priority-p2'
  | 'priority-stretch'
  | 'neutral';

export interface ChipProps {
  tone?: ChipTone;
  size?: 'sm' | 'md';
  children: ReactNode;
}

const TONE_VAR: Record<Exclude<ChipTone, 'neutral'>, string> = {
  'plugin-productivity-cli': '--plugin-productivity-cli',
  'plugin-product-management-cli': '--plugin-product-management-cli',
  'plugin-data-cli': '--plugin-data-cli',
  'plugin-platform-engineering': '--plugin-platform-engineering',
  'plugin-it-admin': '--plugin-it-admin',
  'plugin-engineering-cli': '--plugin-engineering-cli',
  'plugin-schema': '--plugin-schema',
  'plugin-meta-repo': '--plugin-meta-repo',
  'status-todo': '--status-todo',
  'status-in-progress': '--status-in-progress',
  'status-in-review': '--status-in-review',
  'status-done': '--status-done',
  'status-wont-do': '--status-wont-do',
  'priority-p0': '--priority-p0',
  'priority-p1': '--priority-p1',
  'priority-p2': '--priority-p2',
  'priority-stretch': '--priority-stretch',
};

export function Chip({ tone = 'neutral', size = 'md', children }: ChipProps) {
  const style: CSSProperties =
    tone === 'neutral'
      ? {}
      : ({ '--chip-color': `var(${TONE_VAR[tone]})` } as CSSProperties);
  return (
    <span
      className={`${styles.chip} ${size === 'sm' ? styles.sm : styles.md}`}
      style={style}
    >
      {children}
    </span>
  );
}
