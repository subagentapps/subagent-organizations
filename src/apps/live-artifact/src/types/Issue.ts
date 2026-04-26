/**
 * Issue type — matches docs/spec/frontend/design-brief.md and
 * docs/spec/frontend/live-data.md verbatim.
 *
 * The shape is the contract `/api/projects` returns. PR D wires
 * `useProjects` against this; PR C uses it via the static
 * `projects-snapshot.json` fixture.
 */

export const PLUGINS = [
  'productivity-cli',
  'product-management-cli',
  'data-cli',
  'platform-engineering',
  'it-admin',
  'engineering-cli',
  'schema',
  'meta-repo',
] as const;

export type Plugin = (typeof PLUGINS)[number];

export const STATUSES = [
  'Todo',
  'In Progress',
  'In Review',
  'Done',
  "Won't do",
] as const;

export type Status = (typeof STATUSES)[number];

/** Statuses shown by default. "Won't do" collapses unless toggled. */
export const DEFAULT_VISIBLE_STATUSES: readonly Status[] = [
  'Todo',
  'In Progress',
  'In Review',
  'Done',
];

export const PRIORITIES = ['P0', 'P1', 'P2', 'Stretch'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const WAVES = ['Wave 0', 'Wave 1', 'Wave 2', 'Future'] as const;
export type Wave = (typeof WAVES)[number];

export const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Effort = (typeof EFFORTS)[number];

export interface Issue {
  number: number;
  title: string;
  repo: string;
  plugin: Plugin;
  status: Status;
  priority: Priority;
  wave: Wave;
  effort: Effort;
  assignee: string | null;
  url: string;
}

export interface ProjectsSnapshot {
  generatedAt: string;
  issues: Issue[];
}
