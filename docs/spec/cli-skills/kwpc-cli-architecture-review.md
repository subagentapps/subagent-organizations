# kwpc-cli architecture review — incremental improvements

> Status: load-bearing as of 2026-04-27
> Authored by Claude (Opus 4.7) at effort `xhigh`
> Sources: this code review of the 14-plugin kwpc-cli architecture against:
>   - [Week 17 release notes (April 20–24, 2026)](https://code.claude.com/docs/en/whats-new/2026-w17.md)
>   - [Week 16 release notes (April 13–17, 2026)](https://code.claude.com/docs/en/whats-new/2026-w16.md)
>   - [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web.md)

---

## Scope

15-plugin architecture (14 ported + partner-built decision doc) shipped to
`subagentapps/knowledge-work-plugins-cli` across iters 2–6 of 2026-04-27.
This review examines:

1. **Marketplace-publication readiness** (per the cloud-on-the-web docs)
2. **Release-please coverage** (only 5 of 16 plugins are tracked)
3. **Cloud-session compatibility** (per `.claude/settings.json` plugin install model)
4. **Skill content review** for cloud-incompatible patterns (`open`, `xdg-open`, `localhost` URLs)
5. **MCP-tool hooks** (Week 17 — replace bash-shells in skills with MCP calls where appropriate)
6. **`/ultrareview` integration** (Week 17 research preview)
7. **Plugin tagging** (Week 17 — `claude plugin tag` for version validation)
8. **`/usage` breakdown impact** (cache-miss / parallel-session implications)

---

## Critical findings (must-fix before publication)

### 1. NO `marketplace.json` exists — install commands cannot work

**Severity: critical**

Every plugin's `README.md` documents:

```bash
claude plugin marketplace add subagentapps/knowledge-work-plugins-cli
claude plugin install <plugin>-cli@knowledge-work-plugins-cli
```

But `subagentapps/knowledge-work-plugins-cli` has **no `marketplace.json`** at the repo root. Per the [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces), this file is what makes the repo discoverable as a marketplace. The current state: every plugin compiles and the structure is correct, but no install-on-the-web user can actually install them.

**Fix**: ship a `marketplace.json` at the kwpc-cli repo root enumerating all 16 plugins with their owner / description / paths.

### 2. `release-please-config.json` covers only 5 of 16 plugins

**Severity: critical**

The `packages` map currently lists:
```
packages/schema
data-cli
productivity-cli
product-management-cli
platform-engineering
it-admin
```

The 11 plugins added in iter 2–6 are **not in the packages map**:
- pdf-viewer-cli, engineering-cli, design-cli (Wave-1)
- customer-support-cli, enterprise-search-cli, finance-cli, human-resources-cli, legal-cli, operations-cli (Wave-2)
- marketing-cli, sales-cli (Wave-3)

Implications:
- Their `plugin.json` versions never bump
- They don't appear in the `linked-versions` group → never sync versions with the rest
- Release-please ignores their commits when generating release PRs

**Fix**: extend the `packages` map + the `linked-versions` group to include all 11 missing plugins.

### 3. `commitlint.config.js` doesn't enforce per-plugin scopes

**Severity: medium**

The config disables scope enforcement (`scopes are not enforced — release-please uses paths, not scopes`). That's deliberate, BUT: with 16 plugins, a `feat:` commit without a scope can't be routed to a specific plugin's CHANGELOG.md without filename inspection. Release-please does it via paths in `extra-files`, so it works, but contributors won't know which plugin they're committing against.

**Fix (low priority)**: keep the un-enforced scope rule, but **document the convention** in `CONTRIBUTING.md`: "Use `feat(<plugin-name>): ...` for clarity, even though commitlint won't enforce it."

---

## Important findings (should-fix before v0.1.0 release)

### 4. Plugins should be declarable in `.claude/settings.json`, not user-scoped

Per the cloud-on-the-web docs:

> *"Plugins enabled only in your user settings — Not available in cloud sessions. User-scoped `enabledPlugins` lives in `~/.claude/settings.json`. Declare them in the repo's `.claude/settings.json` instead."*

The kwpc-cli `.claude/settings.json` doesn't currently declare any plugins. Cloud sessions of *consumers* of kwpc-cli plugins — anyone using `claude.ai/code` against a repo that wants to use, say, `productivity-cli` — would need the plugin declared in their repo's `.claude/settings.json`.

**Recommendation**: ship a sample `.claude/settings.json.example` at the kwpc-cli repo root showing how a downstream consumer enables specific plugins:

```json
{
  "marketplaces": [
    "subagentapps/knowledge-work-plugins-cli"
  ],
  "enabledPlugins": [
    "productivity-cli@knowledge-work-plugins-cli",
    "engineering-cli@knowledge-work-plugins-cli"
  ]
}
```

### 5. `claude plugin tag` (Week 17) — versioning + dependencies

The Week 17 release notes:

> *"New `claude plugin tag` command creates release git tags for plugins with version validation"*

We're not using it. Each plugin has a version in `.claude-plugin/plugin.json`, but no git tags exist for any plugin. Per `plugin-dependencies` docs, version-resolution depends on these tags.

**Recommendation**: after the marketplace.json + release-please fixes ship, run `claude plugin tag <plugin> <version>` for each plugin's current version. Going forward, the release-please workflow should integrate with `claude plugin tag`.

### 6. Skill content scan: `open`/`xdg-open` references in 10 SKILL.md files

Cloud sessions have no GUI. `open <url>` and `xdg-open <url>` patterns won't work. Reviewer found these patterns in skills like `customer-support-cli/skills/draft-response`, `legal-cli/skills/brief`, `marketing-cli/skills/content-creation`, etc.

**Status**: These are upstream-verbatim content from `anthropics/knowledge-work-plugins`. Per our migration philosophy ("ship verbatim with documented degradation"), they're acceptable — the skills work without the visual `open` step (Claude can just present the URL/file).

**Recommendation**: add a section to the strategy doc: *"Cloud-session caveat — `open` / `xdg-open` references in upstream skills are no-ops in cloud sessions. Output is still produced; visual feedback requires terminal or local environment."*

### 7. MCP-tool hooks (Week 17) — replace bash patterns with MCP calls

Week 17 added `type: "mcp_tool"` hooks. Skills like `engineering-cli/standup` currently `gh issue list` via Bash; in cloud sessions the GitHub-proxy MCP could substitute, eliminating the per-call shell spawn.

**Recommendation (forward-looking)**: revisit each plugin's CONNECTORS.md. Categories where we substituted "→ `gh` CLI" should also note "→ GitHub MCP via `mcp_tool` hook" as the cloud-session path. The github MCP is at `https://api.github.com/mcp`, already declared in 8 of our plugins' `.mcp.json`.

### 8. `/ultrareview` for the kwpc-cli repo

The user's directive for this iter explicitly cited the `/ultrareview` research preview. We can run it on each kwpc-cli PR going forward — and notably, on the marketplace.json + release-please fix PR being shipped from this iter.

**Recommendation**: run `/ultrareview` on the next kwpc-cli PR (the marketplace.json fix). The cloud-fan-out pattern is exactly the use case it's built for.

---

## Other improvements

### 9. Auto-fix routine for the kwpc-cli repo

[Auto-fix](https://code.claude.com/docs/en/claude-code-on-the-web.md#auto-fix-pull-requests) lets Claude respond to CI failures and review comments automatically. The kwpc-cli repo has a CI gate (release-please workflow); Auto-fix could keep PRs unblocked when a contributor's commit message lints fail.

**Recommendation**: install the Claude GitHub App on the kwpc-cli repo (currently only the `subagent-organizations` repo has it).

### 10. `/usage` breakdown impact

Week 16 added `/usage` showing cache misses, parallel sessions, and long context as drivers. Implication for kwpc-cli: large skills (sales-cli's `create-an-asset` is 200+ lines with QUICKREF) trigger cache misses on every invocation. That's fine when each skill runs solo — but the `productivity-cli/start` skill that invokes other skills can stack misses.

**Recommendation (low priority)**: profile each plugin against `/usage` after marketplace publication. Skills > 4000 tokens are candidates for splitting into a `references/` subdirectory.

### 11. Resource limits for cloud sessions

> *"4 vCPUs, 16 GB RAM, 30 GB disk."*

`data-cli` could hit RAM limits on large DuckDB queries — the matrix doesn't currently document this. Should be flagged in `data-cli/CONNECTORS.md`.

### 12. Skill effort default change

Week 16: *"Default effort level for Pro and Max subscribers on Opus 4.6 and Sonnet 4.6 is now `high` (was `medium`)."*

Implication: subagent skill files that explicitly request `effort: medium` are now slower-tier than the user's default. Audit each plugin's `agents/` directories (none exist currently — confirmed).

---

## Recommended PR sequence

1. **PR #20 (CRITICAL)**: marketplace.json + release-please-config.json extension to cover all 16 plugins
2. **PR #21 (IMPORTANT)**: `.claude/settings.json.example` + CONTRIBUTING.md (commit-scope convention + cloud-session caveats)
3. **PR #22 (FORWARD-LOOKING)**: per-plugin CONNECTORS.md updates noting GitHub MCP equivalents for cloud sessions
4. **PR #23 (RELEASE)**: tag all 16 plugins via `claude plugin tag` + cut v0.1.0 release-please cycle

PR #20 is the highest-priority blocker for actual plugin distribution.

---

## What this review doesn't cover

- **End-to-end plugin install verification** on a fresh sandbox — deferred until marketplace.json ships and release-please cuts the first synchronized version
- **Cross-plugin skill conflicts** — would require running multiple plugins simultaneously and observing tool-name / category collisions; deferred to integration testing
- **Performance benchmarking** of each plugin via `/usage` breakdown — needs baseline measurement runs

---

## Provenance

- Architecture under review: 14 ported plugins + partner-built decision doc, all merged to `subagentapps/knowledge-work-plugins-cli` 2026-04-27
- Doc sources: 3 fetched markdown URLs (above)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
- Iter 7 of the kwpc-cli initiative
