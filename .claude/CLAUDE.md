# CLAUDE.md — subagent-organizations

This repo is the **integration-layer (meta-repo)** for a polyrepo of markdown
knowledge-base children, plus a planned typed-primitives SDK for Claude Code orchestration.
TypeScript reference catalog modeled after the Claude Agent SDK's primitive system.

## Conventions Claude must follow (the load-bearing list)

1. **Conventional Commits** for every commit message (`feat:`, `fix:`, `docs:`, `chore:` …).
   `commitlint.config.cjs` enforces; release-please depends on it.

2. **PR after every commit, preapproved.** Per user instruction 2026-04-25:
   - Push commit → immediately `gh pr create` (or push to existing PR branch).
   - Treat each PR as preapproved unless the commit:
     (a) modifies `release-please-config.json` or `release-please.yml`,
     (b) edits anything in `vendor/anthropic/` (read-only by design),
     (c) edits `.gitmodules` (currently chmod 444; needs deliberate `chmod 644` first),
     (d) is a `--force` push or destructive git operation.
   - Branch name: `<type>/<scope>` matching the commit (e.g. commit `feat(kb):` → branch `feat/kb-<topic>`).
   - PR body: include the commit summary + a short test plan.

3. **Spec-first.** Before writing or editing anything in `src/`, locate the matching
   markdown under `docs/spec/`. Update the spec first if the contract changes, then
   mirror it in code. `src/` mirrors `docs/spec/` 1:1 — same paths, same exports, same names.

4. **Don't edit `CHANGELOG.md` by hand** — release-please owns it.

5. **`vendor/anthropic/` is read-only.** 5 git submodules (anthropic-cli,
   anthropic-sdk-typescript, claude-agent-sdk-typescript, mcp-typescript-sdk,
   mcp-ext-apps). `chmod 444 .gitmodules`, `update = none`, `shallow = true`.
   `vendor/lsp/` holds vendored static spec snapshots (also tracked).

6. **No submodules for KB children.** The polyrepo plan
   (`docs/spec/polyrepo-architecture.md`) uses **manifest-only references** —
   `src/data/kb-manifest.json` pins each child by SHA. Submodules are reserved for
   audit-quality snapshots (the SDK + spec repos), not KB content.

7. **Use `bun` not `npm`** for local scripts (`bun run render`, `bun test`).

8. **Token-efficient tool precedence** (per `docs/spec/subagentmcp-sdk/knowledge-base/`):
   - GraphQL for GitHub repo metadata (best ratio)
   - `npm view <pkg> --json` for npm
   - `curl` for `.txt` / `.md` / `.xml` / `.json` URLs (NEVER WebFetch on these)
   - `subagent-html` (planned, via Crawlee + Readability) for HTML
   - `WebFetch` only as last resort

9. **User prompts are starting points, not specs.** The `prompt-adapter` subagent
   (`.claude/agents/prompt-adapter.md`) does pass-0 KB check + passes 1–6 model routing.
   Route through it for ambiguous prompts.

10. **Follow Boris Cherny's published guidance.** Boris (`@bcherny`) leads Claude Code
    at Anthropic. Pinned signal lives in `docs/research/bcherny-signal.md`, refreshed
    by `kb-keeper` on a 12-hour cadence. Cite tweets in commit messages when relevant;
    never cite as spec-quality source — the spec must trace back to a
    `code.claude.com/docs/` URL or release tag.

11. **v2.1.117+ tool guidance** (per `bcherny-signal.md` 2026-04-23): Claude no longer
    calls `Grep` or `Glob` tools by default. They were replaced by direct Bash use of
    `rg`, `fd`, `bfs`, `ugrep`. On native macOS/Linux Claude Code builds, `bfs` and
    `ugrep` are embedded. **Prefer Bash over Grep/Glob for new work.**

## Repo layout (current state, post-PR-#3 merge)

```
.claude/
├── CLAUDE.md                        ← this file (always loaded)
├── settings.json                    ← permissions + claudekit file-guard hook
├── agents/                          ← spawnable subagents
│   ├── repo-orchestrator.md         ← Opus, xhigh effort, blue, lead identity
│   ├── prompt-adapter.md            ← Haiku, low, yellow, KB-check + model routing
│   ├── kb-keeper.md                 ← Sonnet, medium, orange, KB indexer
│   ├── doc-scout.md                 ← Haiku, low, blue, read-only verbatim quoter
│   └── manifest-curator.md          ← curates packages.json + kb-manifest.json
└── prompts/
    └── sdk-author.md                ← --append-system-prompt for SDK authoring posture

docs/
├── spec/                            ← pre-implementation contracts
│   ├── claude-code-types.md         ← 9 enums + 8 Zod schemas
│   ├── polyrepo-architecture.md     ← meta-repo + 3 KB children plan
│   ├── markdown-to-typescript-migration.md
│   ├── claude-directory/            ← 17 specs, one per .claude/ file
│   ├── subagents/                   ← 17 deeplink specs, one per YAML key
│   └── subagentmcp-sdk/             ← 5-layer SDK spec
│       ├── README.md, architecture.md
│       ├── refs/SHA-PINNING.md
│       ├── creators/subagent-creator.md
│       ├── tools/crawlee-content-layer.md
│       ├── orchestrator/lead-pattern.md + prompt-adapter.md
│       ├── tests/VALIDATORS.md
│       └── knowledge-base/README.md ← KB polyrepo source catalog + tool precedence
└── research/                        ← exploratory; not load-bearing for code
    ├── github-well-architected*.md
    ├── stainless-app-bot.md
    ├── lsp-and-ingestion.md
    ├── orchestrator-pattern.md
    ├── anthropic-prompting-guidance.md
    ├── kb-parity-research.md        ← Notion/Confluence/Guru/Coda + Anthropic surfaces
    ├── bcherny-signal.md            ← rolling pin of @bcherny posts
    └── x-plugins-research.md

vendor/
├── anthropic/                       ← 5 read-only submodules
└── lsp/lsp-3.17-specification.html  ← vendored 915 KB single-file

updates/
├── claude-code/                     ← weekly digests (w13/w14/w15) + INDEX.md SHA pins
└── cowork/                          ← Cowork screenshots + Live Artifacts evidence

installs/
├── setup-ghostty.md, tier-2-installs.md
├── superpowers-install.md           ← run /plugin install superpowers@superpowers-marketplace
├── loop-plan.md                     ← 12-task /loop queue
└── loop-progress.md                 ← live tracking

src/                                 ← NOT YET CREATED. spec-first.
```

## Useful commands

```bash
bun run render     # regenerate REFERENCES.md from src/data/packages.json (when ships)
bun run verify     # schema-validate packages.json (when ships)
bun test           # unit tests (Bun test, when ships)
bun run build      # tsup → dist/ (when ships)

gh pr create --base main --head <current-branch>   # auto-PR per rule #2
```

## Approval gates that DO require explicit user OK

Per `docs/spec/subagentmcp-sdk/orchestrator/lead-pattern.md` and the auto-PR rule above:

- Any `git push --force`
- `git reset --hard`
- Spawning >3 subagents simultaneously (Max plan extra-usage cost)
- Spawning an experimental agent team
- Running `/ultrareview` (3 free Max runs through May 5, 2026 — saved for first src/ PR)
- Any cross-org or cross-repo write
- Modifying anything in `vendor/anthropic/`
- Editing `release-please-config.json` or `release-please.yml`
- `chmod 644 .gitmodules` (it's currently 444 by design)
- Account creation, payments, sharing-permission changes

Everything else (commit + PR) is preapproved.

## How to recover from compaction

1. Read `~/.claude/projects/-Users-alexzh-claude-projects/memory/MEMORY.md`
2. Read both linked entries: `subagent-organizations-state.md` and `loop-run-2026-04-26.md`
3. `git log --oneline -10` on current branch
4. Read `installs/loop-progress.md` if a /loop run is active

## Sources for the canonical references

- Top anthropic repos (memorized): `anthropics/skills` (123k★), `claude-code` (117k★),
  `claude-cookbooks` (41k★), **`claude-plugins-official`** (17.8k★), **`knowledge-work-plugins`** (11.5k★),
  `claude-code-action` (7.3k★)
- Top MCP repos: `servers` (84k★), `python-sdk` (22.7k★), `typescript-sdk` (12.3k★),
  `inspector` (9.5k★), **`registry`** (6.7k★)
- safety-research/* org exists (37 repos); top is `bloom` (1.3k★ behavior eval)
- Boris Cherny `@bcherny` — pinned in `docs/research/bcherny-signal.md`
