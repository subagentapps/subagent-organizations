# subagent-organizations

> Typed manifest of zsh + Ghostty + Claude Code packages we use across the subagentapps org.
> Built as TypeScript primitives with discriminated-union inheritance — modeled after the
> Claude Agent SDK's primitive system.

## What this is

A single-source-of-truth catalog of every external package referenced from our zsh, Ghostty, and
Claude Code workflows — typed at compile time, validated at runtime, and rendered to a human-readable
[REFERENCES.md](./REFERENCES.md) on every commit.

It is **not** a vendoring repo (no submodules, no copied source). It's a structured *reference*.

## Status

Pre-implementation. The full architecture is documented as Markdown specs under
[`docs/spec/`](./docs/spec/) on the `docs` branch. `src/` will follow.

## Conventions

- **Conventional Commits** — `feat:`, `fix:`, `chore:`, etc. See [commitlint.config.cjs](./commitlint.config.cjs).
- **Automated changelog** — [release-please](https://github.com/googleapis/release-please) opens a Release PR
  on every push to `main`. Merging it tags + publishes + updates [CHANGELOG.md](./CHANGELOG.md).
- **License** — MIT.

## Layout

```
.
├── src/                  # primitives + directives + manifest loader (planned)
├── docs/                 # human docs (lives on `docs` branch)
│   └── spec/             # markdown spec for every proposed src/ file
├── .claude/              # Claude Code project config
├── .claude-plugins/      # local plugin registry
├── package.json          # npm directives + subpath exports
├── release-please-config.json
└── CHANGELOG.md
```
