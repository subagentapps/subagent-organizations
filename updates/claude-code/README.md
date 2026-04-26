# `updates/claude-code/` — Claude Code weekly digests

Two parallel artifacts per week:

- **Upstream digest** (the published "What's new" page on code.claude.com)
- **Authoring source** (an `--append-system-prompt`-style prompt that drives an agent to produce a *local-perspective* digest tailored to alex's stack — Max plan, CLI surface, polyrepo workflow)

The Downloads folder you copied in (`/Users/alexzh/Downloads/code-claude-docs-whats-new/`)
contained the **authoring source** for weeks 13, 14, and 15, plus 15 screenshots and two
support files (`authoring.json` for a `doc-scout` subagent, `sdk-author.md` for SDK-author
posture).

## Layout

```
updates/claude-code/
├── README.md                           ← this file
├── INDEX.md                            ← SHA-pinned mapping: each week → upstream URL + content SHA
├── authoring.json                      ← doc-scout subagent definition (drives digest authoring)
├── sdk-author.md                       ← --append-system-prompt for SDK authoring posture
├── 2026-w13/
│   ├── digest.md                       ← authoring prompt (from Downloads)
│   ├── README.md                       ← orientation (was here from earlier session)
│   ├── 01-auto-mode.md                 ← per-feature notes (from earlier session)
│   ├── 02-computer-use.md
│   ├── 03-pr-auto-fix.md
│   ├── 04-transcript-search.md
│   ├── 05-powershell-tool.md
│   ├── 06-conditional-hooks.md
│   ├── 07-other-wins.md
│   ├── other-wins-screenshot.png       ← annotated bullet list
│   ├── week13-01-auto-mode.png         ← screenshot per feature
│   ├── week13-02-computer-use-desktop.png
│   ├── week13-03-pr-auto-fix.png
│   ├── week13-04-transcript-search.png
│   ├── week13-05-powershell-tool.png
│   └── week13-06-conditional-hooks.png
├── 2026-w14/
│   ├── digest.md                       ← authoring prompt
│   ├── week14-01-computer-use-cli.png
│   ├── week14-02-powerup.png
│   ├── week14-03-flicker-free-rendering.png
│   ├── week14-04-mcp-result-size-override.png
│   └── week14-05-plugin-executables-on-path.png
└── 2026-w15/
    ├── digest.md                       ← authoring prompt
    ├── week15-01-ultraplan.png
    ├── week15-02-monitor-tool.png
    ├── week15-03-autofix-pr.png
    └── week15-04-team-onboarding.png
```

(Some leftover `Screenshot 2026-04-25 at 3.x.xx PM.png` files from a previous turn live
under `2026-w13/` — they're orientation screenshots for the WAF research, **not** w13
content. Safe to delete with `rm 2026-w13/Screenshot\ *.png` when convenient.)

## Two kinds of files, kept separate on purpose

| Kind | Content | Source | Owner |
|---|---|---|---|
| **Upstream digest** | What Anthropic published on code.claude.com | `https://code.claude.com/docs/en/whats-new/2026-w<N>.md` | Anthropic |
| **Authoring prompt** (`digest.md`) | Instructions to an agent to write alex's local digest | Hand-authored by chrome agent | alex |
| **Per-feature notes** (`<NN>-<feature>.md`, w13 only currently) | Synthesis written during earlier session | This repo | alex |
| **Screenshots** | Anthropic press images | code.claude.com | Anthropic |

The upstream digests are NOT vendored as files here — they're SHA-pinned via
[`INDEX.md`](./INDEX.md) using the same content-SHA pattern as `subagentmcp-sdk/refs/`.
If you need the upstream content, follow the URL in INDEX.md.

## Why we don't vendor the upstream `.md` files

1. They change. The whole point of SHA-pinning is to detect drift, not freeze content.
2. Anthropic's publishing rights are unambiguous via URL; a vendored copy muddies that.
3. The authoring prompts (`digest.md`) capture the *interpretation* alex wants, which is
   the actually-valuable artifact for the polyrepo. The published Anthropic page is
   reference material.

## How a future weekly drop should be organized

When week 16 ships:

1. Save the authoring prompt as `2026-w16/digest.md`
2. Save screenshots as `2026-w16/week16-NN-<feature>.png`
3. Add a row to [`INDEX.md`](./INDEX.md) with the SHA-pinned upstream URL
4. Optionally write `2026-w16/<NN>-<feature>.md` per-feature notes (we did this for w13)

## Auto-fetch + verify pattern

Once `subagentmcp-sdk/tools/` is implemented, the verification loop becomes:

```ts
// scripts/verify-whats-new.ts
import { subagentMd } from '@.../subagentmcp-sdk/tools/subagent-md';
import index from '../updates/claude-code/INDEX.json';

for (const week of index.weeks) {
  const result = await subagentMd.read(week.upstreamUrl);
  if (result.sourceSha256 !== week.pinnedSha256) {
    console.warn(`DRIFT: ${week.id} — ${week.upstreamUrl}`);
    console.warn(`  pinned:  ${week.pinnedSha256}`);
    console.warn(`  current: ${result.sourceSha256}`);
  }
}
```
