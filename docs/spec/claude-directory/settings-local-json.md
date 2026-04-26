# `settings.local.json`

**Location**: `<repo>/.claude/settings.local.json` only (no global form)
**Commit?** **No** — auto-gitignored by Claude Code
**Loads**: Every session
**Precedence**: Higher than `settings.json`, lower than CLI flags

## What it does

Personal overrides that should never be shared with the team. Same shape as
`settings.json` (validated by the same `SettingsSchema`).

## Use cases

- Personal `env` values (e.g. `OPENAI_API_KEY` for a local script — but **prefer `~/.zshrc.local`** for secrets, see Tier-1 cleanup)
- Permission rules you want without committing (e.g. allow `Bash(curl:*)` on your local machine)
- Personal `preferredNotifChannel` if you use a different terminal than the team

## What NOT to put here

- Anything load-bearing for the team (use `settings.json`)
- Long-lived secrets (use environment vars or a vault)

## Related
- [`./settings-json.md`](./settings-json.md) — committed shared settings
