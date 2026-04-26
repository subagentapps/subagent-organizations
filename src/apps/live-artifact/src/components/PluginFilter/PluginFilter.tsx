/**
 * PluginFilter — top filter strip showing each plugin as a togglable chip.
 *
 * Spec: design-brief mentions "kanban grouped by Project Status × Plugin
 * filter". This is the filter — clicking a plugin chip narrows the
 * kanban to that plugin's issues only. Multi-select; clicking an active
 * chip removes it. Empty selection = show all.
 */

import type { Plugin } from '../../types/Issue';
import { PLUGINS } from '../../types/Issue';
import { Chip, type ChipTone } from '../Chip/Chip';
import styles from './PluginFilter.module.css';

const PLUGIN_TONE: Record<Plugin, ChipTone> = {
  'productivity-cli': 'plugin-productivity-cli',
  'product-management-cli': 'plugin-product-management-cli',
  'data-cli': 'plugin-data-cli',
  'platform-engineering': 'plugin-platform-engineering',
  'it-admin': 'plugin-it-admin',
  'engineering-cli': 'plugin-engineering-cli',
  schema: 'plugin-schema',
  'meta-repo': 'plugin-meta-repo',
};

export interface PluginFilterProps {
  /** Plugins currently selected. Empty = show all. */
  selected: ReadonlySet<Plugin>;
  /** Called with the updated set when a chip is clicked. */
  onChange: (next: Set<Plugin>) => void;
  /** Counts per plugin so chips can show e.g. "engineering-cli (5)". */
  counts: Readonly<Record<Plugin, number>>;
}

export function PluginFilter({ selected, onChange, counts }: PluginFilterProps) {
  const allActive = selected.size === 0;
  return (
    <div className={styles.row} role="toolbar" aria-label="Filter by plugin">
      <button
        type="button"
        className={`${styles.allButton} ${allActive ? styles.allButtonActive : ''}`}
        onClick={() => onChange(new Set())}
        aria-pressed={allActive}
      >
        All
      </button>
      {PLUGINS.map((plugin) => {
        const count = counts[plugin] ?? 0;
        const active = selected.has(plugin);
        return (
          <button
            key={plugin}
            type="button"
            onClick={() => {
              const next = new Set(selected);
              if (active) next.delete(plugin);
              else next.add(plugin);
              onChange(next);
            }}
            aria-pressed={active}
            className={`${styles.chipButton} ${active ? styles.chipButtonActive : ''}`}
          >
            <Chip size="sm" tone={PLUGIN_TONE[plugin]}>
              {plugin}
            </Chip>
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
