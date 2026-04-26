# `vendor/`

Read-only vendored references — Anthropic-ecosystem repos pinned for offline reading
and source-level inspection. **Not built, not modified, not redistributed.**

## What lives here

```
vendor/anthropic/
├── anthropic-cli                  # github.com/anthropics/anthropic-cli   (Go)
├── anthropic-sdk-typescript       # github.com/anthropics/anthropic-sdk-typescript
├── claude-agent-sdk-typescript    # github.com/anthropics/claude-agent-sdk-typescript
├── mcp-typescript-sdk             # github.com/modelcontextprotocol/typescript-sdk
└── mcp-ext-apps                   # github.com/modelcontextprotocol/ext-apps
```

## Read-only model

Four overlapping protections:

1. **Pinned SHAs** — `git submodule add` records the current commit SHA in the parent repo.
   `git pull` won't move it; only an explicit "bump" commit does.
2. **`update = none` in [.gitmodules](../.gitmodules)** — prevents `git submodule update` from
   moving any of these submodules.
3. **`shallow = true`** — clones with `--depth 1`, smaller checkout.
4. **`chmod 444 .gitmodules`** — filesystem-level read-only on the manifest itself, so
   accidental edits in an editor fail. Run `chmod 644 .gitmodules` to deliberately edit.

## How to clone the parent repo with these populated

```bash
git clone --recurse-submodules https://github.com/subagentapps/subagent-organizations.git
# or, if you already cloned without submodules:
git submodule update --init --recursive
```

## How to deliberately bump a vendored ref

```bash
git -C vendor/anthropic/anthropic-cli fetch origin
git -C vendor/anthropic/anthropic-cli checkout <new-sha-or-tag>
git add vendor/anthropic/anthropic-cli
git commit -m "chore(vendor): bump anthropic-cli to <new-sha>"
```

## Why this exists alongside `packages.json`

`src/data/packages.json` is the canonical *manifest* of every package we reference
(zsh, ghostty, claude-code, awesome-lists). It tracks ~18 entries by URL + ref but does **not**
vendor source.

The five repos in `vendor/anthropic/` are vendored on top of that because they're so central
to our daily Claude Code work that having local source for grep / read-along during sessions
is worth the ~50–100 MB on-disk cost.

## Related research

See [`docs/research/stainless-app-bot.md`](../docs/research/stainless-app-bot.md) for the
breakdown of how `anthropics/anthropic-cli` orchestrates its release pipeline via the
Stainless GitHub App + GoReleaser.
