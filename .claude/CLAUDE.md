# CLAUDE.md — subagent-organizations

This is a TypeScript reference catalog modeled after the Claude Agent SDK's primitive system.

## Conventions Claude must follow

1. **Conventional Commits** for every commit message (`feat:`, `fix:`, `docs:`, `chore:` …). The repo's `commitlint.config.cjs` enforces this; release-please depends on it.
2. **Spec-first.** Before writing or editing anything in `src/`, locate the matching markdown under `docs/spec/` (on the `docs` branch). Update the spec first if the contract changes, then mirror it in code.
3. **No implementation drift.** `src/` files mirror `docs/spec/` 1:1 — same paths, same exports, same names.
4. **Don't edit `CHANGELOG.md` by hand** — release-please owns it.
5. **Don't add submodules.** This repo is a structured *reference*, not a vendoring repo. If clone-on-demand is needed, use `src/manifest/sync.ts` (writes to `./vendor/`, which is gitignored).
6. **Use `bun` not `npm`** for local scripts (`bun run render`, `bun test`).

## Repo layout (high level)

```
src/         # implementation (mirrors docs/spec/)
docs/spec/   # markdown contract (on `docs` branch)
.claude/     # this folder — Claude Code project config
.claude-plugins/   # local plugin registry
```

## Useful commands

```bash
bun run render     # regenerate REFERENCES.md from src/data/packages.json
bun run verify     # schema-validate packages.json
bun test           # unit tests (Bun test)
bun run build      # tsup → dist/
```
