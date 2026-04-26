# Anthropic jobs board — KB source spec

Status: **draft** (Wave 1, closes #94)
Companion to: [`./refresh-routine.md`](./refresh-routine.md), [`./README.md`](./README.md)

## Why this is a KB source

The Anthropic jobs board signals what Anthropic is hiring for, which is
a high-bandwidth proxy for what the company is investing in (research
direction, product surface, infrastructure focus). Tracking it as a
KB source means kb-keeper detects new roles → those roles inform what
*topics* the KB needs better coverage on (a new "Voice and Audio
Research" role posting is a hint to start tracking voice-related
sources).

Distinct from the other 7 KB sources, which are Anthropic's own
content (docs, blog, sitemaps). Jobs is the company's *intent signal*.

## URL + API

The board lives at:

```
https://job-boards.greenhouse.io/anthropic
```

Greenhouse exposes a JSON API at:

```
https://api.greenhouse.io/v1/boards/anthropic/jobs
https://api.greenhouse.io/v1/boards/anthropic/jobs/<job_id>?content=true
```

The list endpoint returns:

```json
{
  "jobs": [
    {
      "id": 5197337008,
      "title": "Voice and Audio Researcher",
      "absolute_url": "https://job-boards.greenhouse.io/anthropic/jobs/5197337008",
      "departments": [{ "name": "Research", "id": 12345 }],
      "offices": [{ "name": "San Francisco", "id": 67890 }],
      "updated_at": "2026-04-25T12:34:56-07:00",
      "metadata": []
    },
    /* ... more jobs ... */
  ]
}
```

The detail endpoint adds:

```json
{
  "id": 5197337008,
  "title": "Voice and Audio Researcher",
  "content": "<HTML body of the listing>",
  "absolute_url": "https://job-boards.greenhouse.io/anthropic/jobs/5197337008",
  "departments": [...],
  "offices": [...]
}
```

## Reader assignment

**Plain `curl` + JSON parse.** No reader needed because:
- The JSON API has no chrome to strip (subagent-html overkill)
- The payload is structured JSON, not markdown (subagent-md mismatch)
- Sitemaps are XML, not JSON (subagent-xml mismatch)

If we later want the per-job HTML body for content search, **then**
the detail endpoint's `content` field gets piped through `subagent-html`
to extract the prose. For the index-tracking use case, the list
endpoint is sufficient.

## Refresh cadence

**24 hours.** Jobs change daily; weekly cadence would miss short-lived
postings (some roles open and close inside a week, especially executive
or research-lead positions). Daily is also cheap — the list endpoint
returns a few KB.

## Snapshot shape

`docs/research/kb-snapshots/anthropic-jobs/<date>.json`:

```json
{
  "fetched_at": "2026-04-26T06:00:00Z",
  "fetched_via": "curl https://api.greenhouse.io/v1/boards/anthropic/jobs",
  "jobs": [
    {
      "id": 5197337008,
      "title": "Voice and Audio Researcher",
      "absolute_url": "https://job-boards.greenhouse.io/anthropic/jobs/5197337008",
      "departments": ["Research"],
      "offices": ["San Francisco"],
      "updated_at": "2026-04-25T12:34:56-07:00"
    },
    /* ... */
  ]
}
```

Trimmed shape: drop the `metadata` field (always empty for Anthropic),
flatten departments/offices to name-only arrays. The full Greenhouse
API response can balloon with custom fields some companies use; the
trimmed shape keeps the snapshot diff readable.

## Delta detection

Compare snapshots by `(id, title, departments, offices)` tuple:

- **Added job** (new id): one-line in the delta PR's `### Added` section
  with title + department + URL
- **Removed job** (id no longer in latest): one-line in `### Removed`
- **Renamed job** (id matches, title differs): one-line in `### Renamed`
  with old → new title
- **Reorganized job** (id matches, departments or offices changed):
  one-line in `### Reorganized` with the diff

A typical day adds 2-4 jobs and removes 1-2 (jobs filled, postings
closed). The delta PR is small and easy to scan.

## Triggering kb-keeper

When the refresh routine detects a new job whose `title` contains a
term not in the KB term-index, kb-keeper's Trigger 1 fires (per
`.claude/agents/kb-keeper.md`):

> kb-keeper: the user mentioned 'X' but it's not in our term index.

Translated for the routine:

> kb-keeper: a new job posting mentions 'X' but it's not in our term
> index. Find the canonical source and add it.

Not every job-title term is canonical-source-worthy ("Senior Software
Engineer" isn't). The routine filters: only flag terms that look like
**product names** (initial caps, multiple words, distinctive — e.g.
"Voice and Audio Models", "Skills Platform") OR **technical terms**
not already in the index.

A simple heuristic: extract the noun-phrases that aren't role-modifiers
("Senior", "Lead", "Staff", "Principal", "Engineering Manager") and
intersect against the existing term-index. Anything outside the
intersection that passes the canonical-source filter triggers
kb-keeper.

## Failure modes

- **Greenhouse 5xx**: same as other sources — issue on 3rd consecutive
  failure.
- **Schema change** (Greenhouse removes a field we depend on): the
  trimmed-shape extraction degrades gracefully — missing fields default
  to `[]` or `null` and the delta PR notes the schema change for
  follow-up.
- **API rate limiting**: Greenhouse's public board API has no hard
  rate limit documented, but a 24h cadence × 1 fetch/run = 365/year is
  well below any reasonable limit.

## Out of scope

- **Per-job content tracking**: this spec only tracks the listing
  index. If we want full job descriptions over time (e.g. "how did
  the 'Voice Researcher' role description change between 2026-04 and
  2026-10?"), that's a separate per-job fetch routine.
- **Department / location analytics**: counting jobs by office or
  department is a downstream analysis, not a source-tracking
  concern.
- **External job boards** (LinkedIn, Indeed): Anthropic's Greenhouse
  is the canonical source — postings on other boards are
  syndicated.
- **Researcher / Engineer role distinction analysis**: same — that's
  downstream analysis once the source is tracked.

## Acceptance

- [x] URL + API endpoints documented
- [x] Reader assignment justified (plain curl + JSON, no reader needed)
- [x] Refresh cadence pinned (24h)
- [x] Snapshot shape pinned (trimmed Greenhouse JSON)
- [x] Delta detection rules pinned (added / removed / renamed / reorganized)
- [x] Trigger-1 integration with kb-keeper documented
- [ ] First snapshot taken on first cron fire — runtime task
- [ ] Routine RemoteTrigger created — runtime task

## Sources

- [`./refresh-routine.md`](./refresh-routine.md) — overall refresh routine spec
- [`../../../.claude/agents/kb-keeper.md`](../../../.claude/agents/kb-keeper.md) — kb-keeper agent (Triggers 1-3)
- Greenhouse Public API docs: <https://developers.greenhouse.io/job-board.html>
- Sample listing: <https://job-boards.greenhouse.io/anthropic/jobs/5197337008>
