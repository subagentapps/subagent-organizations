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
  /**
   * Short one-line summary shown on the /plugins index tile. Plain prose,
   * no marketing adjectives — describes what the plugin does, not what
   * it aspires to. Spec: docs/spec/brand/voice.md §4.
   */
  summary: string;
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
    summary: 'Personal task view backed by GitHub Issues. start, update, task and memory management skills.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'productivity-cli/README.md',
    areaLabel: 'area/productivity-cli',
  },
  'product-management-cli': {
    slug: 'product-management-cli',
    label: 'product-management-cli',
    summary: 'Specs, roadmaps, sprint plans, stakeholder updates — GitHub Projects v2 as the substrate.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'product-management-cli/README.md',
    areaLabel: 'area/product-management-cli',
  },
  'data-cli': {
    slug: 'data-cli',
    label: 'data-cli',
    summary: 'SQL authoring, query optimization, dashboards. DuckDB local default; BigQuery opt-in.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'data-cli/README.md',
    areaLabel: 'area/data-cli',
  },
  'platform-engineering': {
    slug: 'platform-engineering',
    label: 'platform-engineering',
    summary: 'Plugin authoring + /stack-check. Dependency drift detection across the polyrepo.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'platform-engineering/README.md',
    areaLabel: 'area/platform-engineering',
  },
  'it-admin': {
    slug: 'it-admin',
    label: 'it-admin',
    summary: 'Wraps the Anthropic Admin API for org-level account, role, and usage management.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'it-admin/README.md',
    areaLabel: 'area/it-admin',
  },
  'engineering-cli': {
    slug: 'engineering-cli',
    label: 'engineering-cli',
    summary: 'system-design, testing-strategy, stack-check, architecture-review, incident-postmortem.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'engineering-cli/README.md',
    areaLabel: 'area/engineering-cli',
  },
  schema: {
    slug: 'schema',
    label: 'schema',
    summary: 'Canonical GraphQL schema + bash client mapping kwpc primitives onto GitHub Projects.',
    ownerRepo: 'subagentapps/knowledge-work-plugins-cli',
    readmePath: 'packages/kwpc-schema/README.md',
    areaLabel: 'area/schema',
  },
  'meta-repo': {
    slug: 'meta-repo',
    label: 'subagent-organizations',
    summary: 'Meta-repo: typed manifest, orchestration scaffold, this dashboard.',
    ownerRepo: 'subagentapps/subagent-organizations',
    readmePath: 'README.md',
  },
});
