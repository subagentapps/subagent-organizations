/**
 * Content fetcher with fixture fallback.
 *
 * Spec: docs/spec/frontend/content-routes.md (ADR + Changelog)
 *      + docs/spec/frontend/live-data.md (Pages Function shape)
 *
 * For PR B: every fetch reads from `/content-fixture.json` (build-time
 * static asset). PR E adds the `/api/github-file` Pages Function and
 * this module starts preferring it; the fixture stays as the build-time
 * fallback for offline / no-token scenarios.
 *
 * The two-tier API matches the live-data.md "static-then-live" pattern:
 * sync read of the build-time snapshot, async swap to live without
 * flicker.
 */

export interface AdrEntry {
  /** 4-digit prefix per Anthropic ADR convention. */
  number: string;
  title: string;
  /** Plugin slug — same enum as design-brief plugin chip. */
  plugin: string;
  /** ADR status from front-matter (Accepted / Proposed / Superseded / etc.). */
  status: string | null;
  /** ISO date from front-matter. */
  date: string | null;
  /** Markdown body. May contain cross-links of form `./NNNN-title.md`. */
  body: string;
}

export interface ChangelogEntry {
  plugin: string;
  /** Semver, e.g. "0.0.2". */
  version: string;
  /** ISO date. */
  date: string;
  /** Markdown body — features / fixes / etc. as parsed from release-please output. */
  body: string;
}

export interface ContentFixture {
  /** Sourced as build-time placeholder content; PR E swaps in live data. */
  generatedAt: string;
  adrs: AdrEntry[];
  changelogs: ChangelogEntry[];
}

const FIXTURE_URL = '/content-fixture.json';

/**
 * Module-level cache of the fixture (it doesn't change post-load).
 * `null` = not loaded; failed loads also store `null` so we don't retry
 * in a loop.
 */
let cachedFixture: ContentFixture | null = null;
let fixturePromise: Promise<ContentFixture | null> | null = null;

async function loadFixture(): Promise<ContentFixture | null> {
  if (cachedFixture !== null) return cachedFixture;
  if (fixturePromise !== null) return fixturePromise;
  fixturePromise = fetch(FIXTURE_URL)
    .then((res) => (res.ok ? (res.json() as Promise<ContentFixture>) : null))
    .then((data) => {
      cachedFixture = data;
      return data;
    })
    .catch(() => {
      cachedFixture = null;
      return null;
    });
  return fixturePromise;
}

/** List all ADRs in fixture order (PR E will sort by ascending number). */
export async function listAdrs(): Promise<AdrEntry[]> {
  const fixture = await loadFixture();
  if (!fixture) return [];
  return [...fixture.adrs].sort((a, b) => a.number.localeCompare(b.number));
}

/** Look up a single ADR by 4-digit number. Returns null if missing. */
export async function getAdr(number: string): Promise<AdrEntry | null> {
  const fixture = await loadFixture();
  if (!fixture) return null;
  return fixture.adrs.find((a) => a.number === number) ?? null;
}

/** Combined changelog merged across all plugins, reverse-chrono. */
export async function listChangelogEntries(): Promise<ChangelogEntry[]> {
  const fixture = await loadFixture();
  if (!fixture) return [];
  return [...fixture.changelogs].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Test-only: clear the module cache. Component tests reset between
 * renders so they always start from a clean fetch.
 */
export function __resetFixtureCacheForTests(): void {
  cachedFixture = null;
  fixturePromise = null;
}
