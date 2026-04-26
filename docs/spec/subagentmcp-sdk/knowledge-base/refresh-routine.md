# kb-keeper refresh routine — design contract

Status: **draft** (Wave 1, closes #94)
Companion to:
- [`./README.md`](./README.md) — KB layer overall
- [`./llms-txt-ingestion.md`](./llms-txt-ingestion.md) — eager/lazy classification of `platform.claude.com/llms.txt`
- [`./anthropic-jobs-source.md`](./anthropic-jobs-source.md) — the new jobs-board source this routine ingests
- [`./cookbook-ontology.md`](./cookbook-ontology.md) — 12 cookbook category rules
- [`./contextual-retrieval.md`](./contextual-retrieval.md) — feeds chunks INTO the KB (this routine is the upstream source-fetch)
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — the readers this routine uses
- [`../../../.claude/agents/kb-keeper.md`](../../../.claude/agents/kb-keeper.md) — the agent that runs this routine

## Why this exists

The kb-keeper agent already lists 7 source URLs (5 sitemaps + 2 llms.txt
indexes). What's missing is the **routine that exercises them** —
fetches each source on its volatility cadence, runs delta detection,
opens a PR with diffs.

This spec pins how the routine works without committing to a specific
scheduler implementation. The actual runner is a RemoteTrigger
(`subagentapps-kb-refresh-*`), one per source, sized per cadence.

## Sources

The 7 catalog'd URLs (existing) plus 1 net-new (jobs):

| Source | URL | Reader | Cadence |
|---|---|---|---|
| Claude Code llms.txt | `code.claude.com/docs/llms.txt` | `subagent-md` | 24h |
| Platform llms.txt | `platform.claude.com/llms.txt` | `subagent-md` | 24h |
| Claude marketing sitemap | `claude.com/sitemap.xml` | `subagent-xml` | 24h |
| Anthropic blog sitemap | `anthropic.com/sitemap.xml` | `subagent-xml` | 168h (1w) |
| Platform docs sitemap | `platform.claude.com/sitemap.xml` | `subagent-xml` | 24h |
| Support sitemap | `support.claude.com/sitemap.xml` | `subagent-xml` | 72h |
| MCP sitemap | `modelcontextprotocol.io/sitemap.xml` | `subagent-xml` | 24h |
| **Anthropic jobs** | per [`./anthropic-jobs-source.md`](./anthropic-jobs-source.md) | curl + JSON | **24h** |

The `subagent-md` reader (PR #66) handles llms.txt via passthrough; the
`subagent-xml` reader (PR #67) handles sitemaps via XPath-ish selection.
The jobs source is JSON-API (Greenhouse), so it uses plain `curl` +
manual parse — no reader needed (no chrome to strip).

## The routine

For each source, on its cadence:

1. **Fetch via the appropriate reader.** The reader runs parry-scan on
   output (PR #68) and bloom-cache deduplicates content (PR #69), so
   re-fetching the same content costs ~zero tokens after the first hit.
2. **Diff against the prior snapshot.** Snapshots live at
   `docs/research/kb-snapshots/<source-slug>/<date>.{txt,xml,json}`.
   Diff is one of:
   - **No change** (hash matches prior snapshot) → log + exit
   - **Additions only** (new URLs in the index) → open `chore: <source>
     delta <date>` PR with the snapshot + a one-line summary per new URL
   - **Removals or renames** → open `chore: <source> delta <date>` PR
     with a `### Removed` / `### Renamed` section + open a follow-up
     issue per affected dependency (anything in this repo that pinned
     the removed URL)
3. **For sitemap sources, also surface delta-routing**:
   - New URL ending in `.md` → suggest `subagent-md.read(url)` to
     ingest into the contextual-retrieval pipeline
   - New URL pointing to an HTML doc page → suggest `subagent-html.read(url)`
   - Cookbook URLs → route to the existing cookbook-ontology.md
     12-category bucket per its rules
4. **Bloom-cache hygiene**: before each refresh, the bloom cache's
   `__sqliteCount()` is logged so we can detect runaway growth (>100k
   entries means a rebuild is overdue).

## Routine implementation

A separate cron-scheduled `RemoteTrigger` per source matches the
2026-04-26 routine pattern (the 5 subagentapps-survey-* triggers).
Naming: `kb-refresh-<source-slug>`.

```jsonc
{
  "name": "kb-refresh-platform-llms-txt",
  "cron_expression": "0 6 * * *",   // daily 06:00 UTC for 24h sources
  "job_config": {
    "ccr": {
      "environment_id": "<env>",
      "session_context": {
        "model": "claude-haiku-4-5-20251001",
        "sources": [
          { "git_repository": { "url": "https://github.com/subagentapps/subagent-organizations" } }
        ],
        "allowed_tools": ["Bash", "Read", "Write", "Edit"]
      },
      "events": [{ "data": { /* prompt below */ } }]
    }
  }
}
```

The prompt:

> Refresh source `<URL>` per `docs/spec/subagentmcp-sdk/knowledge-base/refresh-routine.md`.
> Fetch via `<reader>`, diff against `docs/research/kb-snapshots/<source-slug>/<latest>`,
> open a delta PR if any change. Token budget ≤8k input, ≤2k output.

**Why Haiku.** Diff + small markdown writes — Sonnet is wasteful here.

## Cadence-to-cron mapping

| Cadence | Cron expression | Sources |
|---|---|---|
| 24h | `0 6 * * *` (daily 06:00 UTC) | 6 sources |
| 72h | `0 6 */3 * *` (every 3 days) | 1 source (support sitemap) |
| 168h (1w) | `0 6 * * 1` (Mondays 06:00 UTC) | 1 source (anthropic.com) |

8 routines total, batched at the same UTC hour so they all hit before
the user's morning. Stagger by 5 minutes to avoid thundering-herd
against any one host: 06:00, 06:05, 06:10, ...

## Snapshot storage

```
docs/research/kb-snapshots/
├── claude-code-llms-txt/
│   ├── 2026-04-26.txt          ← already pinned in PR #64
│   ├── 2026-04-27.txt          ← next refresh
│   └── deltas/
│       └── 2026-04-27.md       ← the diff document
├── platform-llms-txt/
│   └── 2026-04-26.txt
├── claude-sitemap/
├── anthropic-sitemap/
├── platform-sitemap/
├── support-sitemap/
├── mcp-sitemap/
└── anthropic-jobs/
    ├── 2026-04-26.json
    └── deltas/
```

Snapshots are **checked in**. They're small (few KB to <2MB each) and
having git history is the simplest way to audit "what did this source
say on date X". The bloom cache provides intra-process dedup; git
provides cross-time audit.

Old snapshots are pruned to **keep most recent 30** per source. The
prune happens in the same routine that adds the new snapshot, so the
PR includes both the addition and the deletions.

## Failure modes

- **Source 5xx**: routine logs the failure, opens an issue on the 3rd
  consecutive failure (so transient outages don't spam). Does not open
  a delta PR.
- **Source returned malformed content** (e.g. sitemap doesn't parse):
  same — issue on 3rd consecutive failure. The reader's bloom-cache
  doesn't add the malformed payload, so re-fetching on the next cron
  fire doesn't short-circuit.
- **parry MALICIOUS verdict** on the fetched content: routine refuses
  to write the snapshot, opens an issue with the source URL + the
  `parryScore` so a human can audit. CLAUDE.md gate: prompt-injection
  in a documentation source is a red flag, surface to user.
- **Snapshot directory missing**: routine creates it on first run.

## Out of scope

- **Pushing snapshots to a separate repo** (e.g. `subagentapps/kb-snapshots`).
  Same-repo is simpler; if size becomes an issue (>100MB), revisit.
- **Per-URL retention configuration**. The 30-snapshot keep is uniform
  across all sources. If we grow more sources where 30 is too few or
  too many, add a per-source override later.
- **Ingestion into the contextual-retrieval pipeline**. The refresh
  surfaces new URLs; *ingesting* them into the KB index is a separate
  routine (next iter).
- **Search-result re-ranking from refresh data.** The retriever doesn't
  consult the snapshot directly; chunks come from the eager-ingest
  pipeline.

## Acceptance

- [x] Routine design pinned (per-source cadence, reader assignment, PR shape)
- [x] Snapshot storage layout pinned
- [x] Failure-mode contract pinned
- [x] Anthropic jobs source spec'd in the companion file
- [ ] 8 RemoteTrigger routines created — separate runtime task; user
      pre-approved per CLAUDE.md `i pre-approve` framing
- [ ] First snapshot pinned for each source — happens on first cron fire

## Sources

- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — readers
- [`./llms-txt-ingestion.md`](./llms-txt-ingestion.md) — llms.txt ingestion plan
- [`./anthropic-jobs-source.md`](./anthropic-jobs-source.md) — companion spec
- [`../../../.claude/agents/kb-keeper.md`](../../../.claude/agents/kb-keeper.md) — agent that runs the routine
