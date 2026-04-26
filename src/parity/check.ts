/**
 * Parity tracker derivation script.
 *
 * Spec: docs/spec/cli-parity-tracker.md
 *
 * Walks `docs/spec/cli-skills/` and derives the per-skill status. Compares
 * against the matrix declared in `docs/spec/cli-parity-tracker.md` and
 * prints a diff when they disagree.
 *
 * Usage:
 *   bun run parity-check        # exit 0 if matrix matches reality
 *   bun run parity-check --fix  # (future) rewrite the matrix to match reality
 *
 * Per CLAUDE.md #2 + #3: this is the implementation of the contract in
 * `docs/spec/cli-parity-tracker.md`. Update the spec first if changing
 * what gets tracked.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// src/parity/ → repo root
const REPO_ROOT = join(HERE, '..', '..');
const CLI_SKILLS_DIR = join(REPO_ROOT, 'docs', 'spec', 'cli-skills');
const TRACKER_PATH = join(REPO_ROOT, 'docs', 'spec', 'cli-parity-tracker.md');

export type ParityStatus = 'ported' | 'tbd' | 'divergent';

export interface ParityRow {
  plugin: string;
  skill: string;
  status: ParityStatus;
}

/**
 * The set of (plugin, skill) pairs we currently track. Hand-curated because
 * upstream skill lists are the source of truth and they don't live in this
 * repo. New skills get added here when the upstream survey identifies them.
 */
export const TRACKED_SKILLS: Array<{ plugin: string; skill: string }> = [
  { plugin: 'productivity', skill: 'start' },
  { plugin: 'productivity', skill: 'update' },
  { plugin: 'productivity', skill: 'task-management' },
  { plugin: 'productivity', skill: 'memory-management' },
  { plugin: 'product-management', skill: 'write-spec' },
  { plugin: 'product-management', skill: 'roadmap-update' },
  { plugin: 'product-management', skill: 'stakeholder-update' },
  { plugin: 'product-management', skill: 'synthesize-research' },
  { plugin: 'product-management', skill: 'competitive-brief' },
  { plugin: 'product-management', skill: 'metrics-review' },
  { plugin: 'product-management', skill: 'product-brainstorming' },
  { plugin: 'product-management', skill: 'sprint-planning' },
  { plugin: 'engineering', skill: 'system-design' },
  { plugin: 'engineering', skill: 'testing-strategy' },
  { plugin: 'engineering', skill: 'stack-check' },
  { plugin: 'engineering', skill: 'architecture-review' },
  { plugin: 'engineering', skill: 'incident-postmortem' },
];

/**
 * Derive the status of one (plugin, skill) pair from filesystem state.
 *
 * Rules:
 *   1. If the per-skill spec exists at
 *      `docs/spec/cli-skills/<plugin>-cli-<skill>.md` AND that spec contains
 *      a "Deviations from upstream:" block with non-empty content → divergent
 *   2. Else if the spec exists → ported
 *   3. Else → tbd
 *
 * The "divergence" detection here is intentionally rough — the matrix's
 * `divergence-summary` column captures the human-curated detail.
 */
export function deriveStatus(
  plugin: string,
  skill: string,
  cliSkillsDir = CLI_SKILLS_DIR,
): ParityStatus {
  const file = join(cliSkillsDir, `${plugin}-cli-${skill}.md`);
  if (!existsSync(file)) return 'tbd';
  const content = readFileSync(file, 'utf8');
  // Look for an explicit Deviations section with at least one non-empty line.
  const m = content.match(/Deviations from upstream:?\s*\n([\s\S]*?)(?:\n##|\n---|\n\*\*|$)/i);
  if (m && m[1]) {
    const body = m[1].trim();
    if (body && body !== 'None.' && body !== '(none)') {
      return 'divergent';
    }
  }
  return 'ported';
}

/**
 * Parse the matrix's status declarations from cli-parity-tracker.md.
 *
 * Matrix rows look like:
 *   | `start` | `/productivity:start` | **ported** | [...] | ... | — |
 *
 * We extract the skill name from the first cell and the status from the
 * third. Rows without a clean **status** marker are skipped.
 */
export function parseTrackerMatrix(
  trackerPath = TRACKER_PATH,
): Map<string, ParityStatus> {
  const out = new Map<string, ParityStatus>();
  const lines = readFileSync(trackerPath, 'utf8').split('\n');
  let currentPlugin: string | null = null;
  for (const line of lines) {
    const heading = line.match(/^### ([\w-]+) → ([\w-]+)/);
    if (heading) {
      currentPlugin = heading[1] ?? null;
      continue;
    }
    if (!currentPlugin) continue;
    const row = line.match(/^\|\s*`([\w-]+)`\s*\|.*?\|\s*\*\*(\w+)\*\*\s*\|/);
    if (!row) continue;
    const skill = row[1]!;
    const status = row[2]!.toLowerCase();
    if (status === 'ported' || status === 'tbd' || status === 'divergent') {
      out.set(`${currentPlugin}:${skill}`, status as ParityStatus);
    }
  }
  return out;
}

/** Diff one row of expected (declared) vs derived. */
export interface ParityDiff {
  key: string;
  declared: ParityStatus | undefined;
  derived: ParityStatus;
}

export function check(): ParityDiff[] {
  const declared = parseTrackerMatrix();
  const diffs: ParityDiff[] = [];
  for (const { plugin, skill } of TRACKED_SKILLS) {
    const key = `${plugin}:${skill}`;
    const derived = deriveStatus(plugin, skill);
    const decl = declared.get(key);
    // `divergent` is a human-curated forward commitment; the script can't
    // detect it from filesystem state alone (a divergent spec might not
    // exist yet — the divergence is the planned shape, not the filesystem
    // proof). So we allow `divergent` declared with `tbd` derived without
    // flagging drift. Once the spec lands, `deriveStatus` returns the
    // refined verdict.
    if (decl === 'divergent' && derived === 'tbd') continue;
    if (decl !== derived) {
      diffs.push({ key, declared: decl, derived });
    }
  }
  return diffs;
}

/** CLI entrypoint. */
function main(): void {
  const declared = parseTrackerMatrix();
  const counts = { ported: 0, tbd: 0, divergent: 0 };
  for (const { plugin, skill } of TRACKED_SKILLS) {
    const key = `${plugin}:${skill}`;
    const derived = deriveStatus(plugin, skill);
    const decl = declared.get(key);
    const padded = key.padEnd(40);
    const note = decl === undefined
      ? '(missing from matrix)'
      : decl === derived
        ? '(matches matrix)'
        : `(matrix says ${decl})`;
    process.stdout.write(`${padded} ${derived.padEnd(10)} ${note}\n`);
    counts[derived]++;
  }
  const total = TRACKED_SKILLS.length;
  process.stdout.write(
    `\nSummary: ${counts.ported} ported, ${counts.tbd} tbd, ${counts.divergent} divergent (out of ${total} tracked)\n`,
  );
  const diffs = check();
  if (diffs.length > 0) {
    process.stderr.write(`\nMatrix drift: ${diffs.length} row(s) disagree:\n`);
    for (const d of diffs) {
      process.stderr.write(
        `  ${d.key}: matrix=${d.declared ?? '(missing)'}, derived=${d.derived}\n`,
      );
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
