/**
 * Static registry of plugin → GitHub repo mapping.
 *
 * Used by PluginPage to fetch README + recent-issues, and by the future
 * snapshot-projects script to know which repos to walk.
 *
 * Mirrors the PROJECT_MAP from `functions/api/projects.ts` but lives
 * client-side here. The two are deliberately duplicated rather than
 * shared because the Pages Function runs on Cloudflare Workers (no
 * Bun ESM imports across the function/src boundary at this scaffold
 * stage). When the F polish pass shares them, the source of truth is
 * the Function's PROJECT_MAP.
 */

import type { Plugin } from '../types/Issue';

export interface PluginInfo {
  slug: Plugin;
  /** Display label shown on the plugin landing page. */
  label: string;
  /** owner/repo where the plugin's source lives. */
  ownerRepo: string;
  /** Path to the plugin's README.md within the repo. */
  readmePath: string;
  /** Optional area label that filters issues to this plugin within the repo. */
  areaLabel?: string;
}

export const PLUGIN_REGISTRY: Readonly<Record<Plugin, PluginInfo>> = Object.freeze({
  'productivity-cli': {
    slug: 'productivity-cli',
    label: 'productivity-cli',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'productivity-cli/README.md',
    areaLabel: 'area/productivity-cli',
  },
  'product-management-cli': {
    slug: 'product-management-cli',
    label: 'product-management-cli',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'product-management-cli/README.md',
    areaLabel: 'area/product-management-cli',
  },
  'data-cli': {
    slug: 'data-cli',
    label: 'data-cli',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'data-cli/README.md',
    areaLabel: 'area/data-cli',
  },
  'platform-engineering': {
    slug: 'platform-engineering',
    label: 'platform-engineering',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'platform-engineering/README.md',
    areaLabel: 'area/platform-engineering',
  },
  'it-admin': {
    slug: 'it-admin',
    label: 'it-admin',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'it-admin/README.md',
    areaLabel: 'area/it-admin',
  },
  'engineering-cli': {
    slug: 'engineering-cli',
    label: 'engineering-cli',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'engineering-cli/README.md',
    areaLabel: 'area/engineering-cli',
  },
  schema: {
    slug: 'schema',
    label: 'schema',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'packages/kwpc-schema/README.md',
    areaLabel: 'area/schema',
  },
  'meta-repo': {
    slug: 'meta-repo',
    label: 'subagent-organizations',
    ownerRepo: 'subagentapps/subagent-organizations',
    readmePath: 'README.md',
  },
});
