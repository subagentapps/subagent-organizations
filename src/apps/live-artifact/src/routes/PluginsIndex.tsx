/**
 * PluginsIndex — `/plugins` route.
 *
 * Spec: docs/spec/frontend/content-routes.md § PluginsIndex
 *      "8-tile grid; each tile shows label + summary + open-issue
 *       count; links to /plugins/:name."
 *
 * Differentiates the /plugins route from /:
 *   - /         → Dashboard (kanban view of every issue across plugins)
 *   - /plugins  → PluginsIndex (catalog: 8 plugins, summaries, counts,
 *                  one click into the per-plugin landing page)
 *
 * Per the ultraplan that produced PR #122: visitors hitting /plugins
 * previously aliased to Dashboard, which made "Plugins" indistinguishable
 * from "Dashboard" in the topbar nav. This component is the actual
 * "Plugins" page.
 */

import { useMemo } from 'react';
import { Link } from 'wouter';
import { PLUGINS } from '../types/Issue';
import { PLUGIN_REGISTRY } from '../lib/pluginRegistry';
import { useProjects } from '../hooks/useProjects';
import { countByPlugin, emptyPluginCounts } from '../lib/issueCounts';
import sharedStyles from './shared.module.css';
import indexStyles from './PluginsIndex.module.css';

export function PluginsIndex() {
  const { issues, source } = useProjects();

  const counts = useMemo(
    () => (issues.length > 0 ? countByPlugin(issues) : emptyPluginCounts),
    [issues],
  );

  return (
    <section className={sharedStyles.section}>
      <header className={indexStyles.header}>
        <h1 className={sharedStyles.title}>Plugins</h1>
        <p className={sharedStyles.subtitle}>
          The 8 plugins shipped from the polyrepo. Each tile shows the
          live open-issue count and links to the per-plugin landing
          page.
          {source === 'snapshot' ? (
            <span className={indexStyles.snapshotBadge} title="Showing the static snapshot — live data unavailable">
              snapshot
            </span>
          ) : null}
        </p>
      </header>

      <ul className={indexStyles.grid} role="list">
        {PLUGINS.map((slug) => {
          const info = PLUGIN_REGISTRY[slug];
          const count = counts[slug];
          return (
            <li key={slug} className={indexStyles.tile}>
              <Link href={`/plugins/${slug}`} className={indexStyles.tileLink}>
                <div className={indexStyles.tileHeader}>
                  <span className={indexStyles.tileLabel}>{info.label}</span>
                  <span
                    className={indexStyles.tileCount}
                    aria-label={`${count} open issues`}
                  >
                    {count}
                  </span>
                </div>
                <p className={indexStyles.tileSummary}>{info.summary}</p>
                <span className={indexStyles.tileFooter}>
                  {info.ownerRepo}
                  <span aria-hidden="true" className={indexStyles.tileArrow}>
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
