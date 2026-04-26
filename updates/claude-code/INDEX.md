# Weekly digest index — SHA-pinned

Each row pins the **upstream** Anthropic What's-New page by content-SHA. Refresh by
re-running `curl -sSL <url> | shasum -a 256`. Discrepancy between the local pin and the
live SHA means Anthropic re-published — investigate before merging anything based on the
old content.

## Pins (verified 2026-04-25)

| Week | Range | Upstream URL | SHA-256 (content) | Bytes | Local digest |
|---|---|---|---|---|---|
| **w13** | March 23–27, 2026 | <https://code.claude.com/docs/en/whats-new/2026-w13.md> | `e65c24343a906e7512b5871a6cebc1dd6a032238965cd892efcd62b6bd1caa75` | 7,974 | [`./2026-w13/digest.md`](./2026-w13/digest.md) |
| **w14** | March 30 – April 3, 2026 | <https://code.claude.com/docs/en/whats-new/2026-w14.md> | `41ee7c631497425f91177c72853d564283bffcee0ed96fb7245a249eac678166` | 7,729 | [`./2026-w14/digest.md`](./2026-w14/digest.md) |
| **w15** | April 6–10, 2026 | <https://code.claude.com/docs/en/whats-new/2026-w15.md> | `d9f88f29f1ca640f60d4f718d5d510cfd8910a426e3cae1cc62ce816380f7baa` | 7,237 | [`./2026-w15/digest.md`](./2026-w15/digest.md) |

## llms.txt provenance

Per `https://code.claude.com/docs/llms.txt` (pulled 2026-04-25), the canonical entries:

```
- [Week 13 · March 23–27, 2026](https://code.claude.com/docs/en/whats-new/2026-w13.md): Auto mode for hands-off permissions, computer use built in, PR auto-fix in the cloud, transcript search, and a PowerShell tool for Windows.
- [Week 14 · March 30 – April 3, 2026](https://code.claude.com/docs/en/whats-new/2026-w14.md): Computer use in the CLI, interactive in-product lessons, flicker-free rendering, per-tool MCP result-size overrides, and plugin executables on PATH.
- [Week 15 · April 6–10, 2026](https://code.claude.com/docs/en/whats-new/2026-w15.md): Ultraplan cloud planning, the Monitor tool with self-pacing /loop, /team-onboarding for packaging your setup, and /autofix-pr from your terminal.
- [What's new](https://code.claude.com/docs/en/whats-new/index.md): A weekly digest of notable Claude Code features, with code snippets, demos, and context on why they matter.
```

The "What's new" index page (`/en/whats-new/index.md`) lists all weeks; treat it as the
authoritative source of truth for which weeks exist.

## Local digest SHAs (the *authoring* files, not the upstream)

Documenting separately so it's clear these are different content:

| Week | File | SHA-256 of authoring prompt |
|---|---|---|
| w13 | `2026-w13/digest.md` | `662712e6cd9e3a5df3e88f957609786ec0f69e7ceb649e6583ced92aaff8bb57` |
| w14 | `2026-w14/digest.md` | `3bb5045d2eb8f0d6aefb776adb44f81287cd96651464fac7e707ade2f0f6bb8b` |
| w15 | `2026-w15/digest.md` | `0b387fe656b00f10e876cd32c84b25dd91ccecd2492ef5c4dc9570ec70d0ce11` |

These are *authoring instructions* — locked into the repo as committed artifacts. Don't
update unless you're deliberately changing alex's interpretation of that week's release.

## Weekly content summary (from llms.txt one-liners)

### Week 13 — Auto mode, computer use, PR auto-fix, transcript search, PowerShell

The release where Auto mode shipped (research preview) with a permission classifier;
computer use moved into the Desktop app; PR auto-fix landed for Claude Code on the web;
transcript search via `/` in fullscreen mode; PowerShell tool for Windows.

Per-feature notes already written during an earlier session — see
[`./2026-w13/01-auto-mode.md`](./2026-w13/01-auto-mode.md) through
[`./2026-w13/07-other-wins.md`](./2026-w13/07-other-wins.md).

### Week 14 — Computer use in CLI, /powerup, flicker-free, MCP overrides, plugin PATH

Per the authoring prompt (`./2026-w14/digest.md`):
- **Computer use in the CLI** (research preview) — drive native macOS / iOS-simulator GUIs from terminal
- **`/powerup`** — surfaces new features that may have shipped since last context refresh
- **Flicker-free rendering** — `CLAUDE_CODE_NO_FLICKER=1` keeps prompt pinned in long sessions
- **MCP result-size override** — per-tool size caps for noisy MCP responses
- **Plugin executables on PATH** — plugin-bundled binaries now resolve via PATH

Notable new HookEvent: **`PermissionDenied`** (per the shared-primitives section in the
authoring prompt).

Per-feature notes: not yet written. Consider writing `01-computer-use-cli.md` etc. if/when
we adopt these features.

### Week 15 — Ultraplan, Monitor tool, /autofix-pr from terminal, /team-onboarding

Per llms.txt:
- **Ultraplan** — cloud planning (sibling to ultrareview)
- **Monitor tool** — long-running watcher with self-pacing via `/loop`
- **`/autofix-pr`** — terminal-side equivalent of the web auto-fix from w13
- **`/team-onboarding`** — packages your setup for new team members

Per-feature notes: not yet written.

## Verification command

To re-verify all three pins right now:

```bash
for w in 13 14 15; do
  curl -sSL "https://code.claude.com/docs/en/whats-new/2026-w${w}.md" | shasum -a 256
done
```

Expected output should match the SHA-256 column above. Mismatch = drift.
