# Boris Cherny (`@bcherny`) signal

Date: 2026-04-26 (PST 2026-04-25 evening)
Source: `x.com/bcherny`, captured via Chrome MCP on `addyjadecli` profile (signed in, following @bcherny)
Method: DOM harvest of rendered tweet articles. Captured 8 substantive posts from Apr 17 → Apr 23 2026.

## Why we track this signal

Per user instruction (2026-04-25): *"we want to follow boris cherny guidance who regularly writes on latest features."*

Boris Cherny leads Claude Code at Anthropic. His public posts are a high-signal source for:
- Feature ship dates and verbatim feature names
- Quality issues and post-mortems (early warning of regressions)
- Behavioral changes between Claude Code releases
- Anthropic-internal recommendations not yet in the docs

We pin **specific tweets** as load-bearing context, not the profile in general. Each row
below should be read as: *"this is what Boris said on this date; we cite when relevant."*

## Captured posts (Apr 17–23, 2026)

| Date (UTC) | Topic | Verbatim | Why it matters for our repo |
|---|---|---|---|
| **2026-04-23** | Quality post-mortem | *"We've been looking into recent reports around Claude Code quality issues, and just published a post-mortem on what we found."* | Indicates a quality-issue period worth knowing about; pin the post-mortem URL when found |
| **2026-04-23** | Opus 4.7 issues in CC | *"Separately, we've also heard reports of issues with Opus 4.7 in Claude Code. The team is working on those and we'll share more as we roll out improvements over the coming days."* | We bumped `repo-orchestrator` to `effort: xhigh` on Opus 4.7 — may need to re-evaluate if the issues are effort-level related |
| **2026-04-23** | Usage limits reset | *"We're resetting usage limits for subscribers. Thank you so much for your feedback and patience!"* | Operational; affects /loop run cost planning |
| **2026-04-23** | Grep/Glob → Bash (repost of @dmwlff) | *"After 2.1.117, you may notice that Claude doesn't call its Grep or Glob Tool anymore. YES!!! It only took four months. It's faster than ever and it's all Bash."* | **Major.** Changes the `Read/Edit/Glob/Grep/Bash` tool surface we cite throughout `BuiltinTool` enum + `repo-orchestrator.md` tool guidance. Since v2.1.117, Bash subsumes Grep+Glob. Update tool guidance accordingly. |
| **2026-04-22** | Webby award | *"Claude Code won a Webby!"* | Brand-only; cite for context if writing about adoption |
| **2026-04-21** | 2% prosumer A/B test | *"For clarity, we're running a small test on ~2% of new prosumer signups. Existing Pro and Max subscribers aren't affected."* | If we see odd sign-up flows in the docs, this is why |
| **2026-04-20** | **Live artifacts in Cowork** | *"In Cowork, Claude can now build live artifacts: dashboards and trackers connected to your apps and files. Open one any time and it refreshes with current data."* | **Canonical definition of Live Artifacts** — confirms our screenshot evidence + the KB-parity-research.md hypothesis |
| **2026-04-17** | Skip-permissions in Cowork | *"Skip all permissions for Claude Cowork. Use with care, brought to you by @dreamofabear"* | Security-relevant; affects how we describe HITL approval gates for Cowork-based KB workflows |

## Three actionable changes from this signal

### 1. Update `BuiltinTool` enum + tool-guidance for v2.1.117+ Grep/Glob deprecation

Per Wolff repost (Boris-curated): **Grep and Glob no longer get called by Claude in v2.1.117+; Bash subsumes them.** That breaks one of the explicit conventions in `repo-orchestrator.md` ("Use `Glob` to find files by pattern" etc.).

**Fix**: in `.claude/agents/repo-orchestrator.md` Tool guidance section, add:
> *"Note (per Boris Cherny, 2026-04-23): since v2.1.117, Claude no longer calls `Grep` or `Glob` tools by default — they were replaced by direct Bash use of `rg`, `fd`, `bfs`/`ugrep` (embedded on macOS/Linux native builds per CHANGELOG v2.1.117). Prefer Bash over Grep/Glob for new work."*

Defer the actual `BuiltinTool` enum change until kb-keeper re-pins the tool list — the docs may not have caught up.

### 2. Pin Live Artifacts canonical definition

Add to `docs/research/kb-parity-research.md` §"Cowork Live Artifacts":
> *Canonical definition (Boris Cherny, x.com/bcherny status 2047... 2026-04-20):* *"dashboards and trackers connected to your apps and files. Open one any time and it refreshes with current data."*

This locks the feature description so we don't speculate.

### 3. Cite the post-mortem when it lands

Boris said *"we've published a post-mortem"* — the URL is a real artifact we should pin. Add to `kb-keeper`'s seed pin list once located. Most likely on `claude.com/blog` or `anthropic.com/news`.

## Posture: how to use bcherny signal going forward

1. **Re-fetch on a 12-hour cadence** via `kb-keeper` (Boris posts ~daily; 12h is enough)
2. **Filter to:** posts authored by `@bcherny` (skip retweets unless Boris adds a comment)
3. **Pin the load-bearing claims** verbatim with timestamp + status link, into a rolling `docs/research/bcherny-signal.md` updated by kb-keeper
4. **Do NOT cite Boris in committed code** — his tweets are signal, not specification. The commit message can cite; the spec must trace back to a `code.claude.com/docs/` URL or a release tag.

## Posture: avoid

- Citing Boris on things alex didn't ask about — keep it scoped to Claude Code feature signal
- Treating retweets as endorsements — many of his retweets are amplification, not curation
- Over-fitting to his personal pace — he posts more during release windows; sparse weeks aren't a signal of inactivity

## What we couldn't capture

- X virtualizes the timeline; programmatic scrolls didn't load more posts after the first 8. Posts older than Apr 17 2026 weren't fetched.
- Replies and DMs (out of scope).
- Engagement counts (likes/reposts) — not load-bearing for our use.

If we need historical posts, the right tool is one of the X plugins surveyed in
[`./x-plugins-research.md`](./x-plugins-research.md), via authenticated browser
automation — not via the X API ($100/mo).

## Sources

- Profile: <https://x.com/bcherny>
- Capture method: Chrome MCP `javascript_tool` against rendered DOM
- Captured under user profile: `addyjadecli` (signed in, follows @bcherny)
