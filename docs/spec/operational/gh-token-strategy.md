# GitHub token strategy — `subagentapps/subagent-organizations`

Status: **adopted** as of 2026-04-25 PDT
Audience: orchestrator iterations + future operators
Related: GitHub Project #2, repo CLAUDE.md (no submodules)

## Decision

The `gh` CLI on `admin@jadecli.com` uses a **classic OAuth token (`gho_*`)**
with the following scopes: `gist`, `project`, `read:org`, `repo`, `workflow`.

The fine-grained PAT (`github_pat_*`) created via Chrome MCP on 2026-04-25
is held as a **fallback** but is not currently the active token.

## Why classic over fine-grained (today)

| Dimension | Classic gho_ | Fine-grained github_pat_ | Choice |
|---|---|---|---|
| Source of token | Browser OAuth via `gh auth login` | Manual creation in Settings | classic = less manual |
| Acquisition path | One `gh auth refresh -h github.com -s read:project,project,workflow` call | Multi-step Chrome form (encoded in `installs/prompts/github-pat-fine-grained.md`) | classic = simpler |
| Expiration | Doesn't auto-expire (kept fresh by gh CLI) | Mandatory; today's accidentally got 30 days instead of 90 | classic = no rotation pain |
| Scope granularity | Org-wide for the scopes granted | Per-repo, per-permission | fine-grained wins **eventually** but adds friction now |
| Audit trail | OAuth events on github.com/settings/applications | Token-creation event in Settings → Developer settings → Personal access tokens | comparable |
| Anthropic-engineering match | claude-code-assisted PRs use OAuth-style today | Fine-grained matches release-please-action posture | mixed |

**Trade**: For Wave 0 / Wave 1 work where the orchestrator runs alone on
this Mac, the classic token's no-rotation simplicity outweighs fine-grained
isolation. For Wave 2+ when more than one identity touches the polyrepo,
revisit and migrate to fine-grained per `installs/prompts/github-pat-fine-grained.md`.

## Currently authorized scopes (verbatim from `gh auth status`)

```
github.com
  ✓ Logged in to github.com account admin-jadecli (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'project', 'read:org', 'repo', 'workflow'
```

## What each scope unlocks (load-bearing)

| Scope | Used by |
|---|---|
| `repo` | `git push`, `gh pr create`, `gh issue create`, `gh issue close`, all repo file ops |
| `project` | `gh project list/view/create`, `gh api graphql` mutations on `projectV2`, `updateProjectV2ItemFieldValue` (the orchestrator's main lever) |
| `read:org` | Org membership + org-level GraphQL queries |
| `workflow` | Edit `.github/workflows/*.yml` (release-please bumps, future CI) |
| `gist` | `gh gist` (rarely used) |

## Acceptance criteria for "the token works"

The orchestrator runs `gh auth status` at the top of each iteration and
expects to see all 5 scopes above. If any of `repo`, `project`, or
`workflow` is missing, the iteration aborts and surfaces an issue.

A simple smoke test:

```bash
# Read: Project board (needs project)
gh api graphql -f query='{ organization(login:"subagentapps"){ projectV2(number:2){ title } } }' \
  --jq '.data.organization.projectV2.title'

# Write: project field mutation (needs project + repo)
# (do not run as a smoke test — it mutates state)

# Read: org repos (needs read:org)
gh repo list subagentapps --limit 1 --json name --jq '.[0].name'
```

If all three return non-empty without `INSUFFICIENT_SCOPES` errors, the
token is healthy.

## Rotation plan

**Classic tokens**: no scheduled rotation. Re-run `gh auth refresh -h
github.com -s read:project,project,workflow` if any new scope is required.
The gh CLI keeps the underlying token fresh against the OAuth lifecycle.

**Fine-grained PAT** (the unused backup, expires 2026-05-25): when it
expires, regenerate via `installs/prompts/github-pat-fine-grained.md`
explicitly setting 90-day expiration this time (the first run hit GitHub's
30-day default by mistake — see iter 1's lessons). Or let it lapse if
classic remains the active token.

## Migration path to fine-grained (future)

When/if we migrate (Wave 2+ trigger conditions: multiple identities, CI
needs scoped writes, security review requires least-privilege):

1. Use `installs/prompts/github-pat-fine-grained.md` to generate a new
   90-day fine-grained PAT
2. `gh auth logout -h github.com`
3. `echo "github_pat_..." | gh auth login --hostname github.com --with-token`
4. Verify scopes include `Projects: Read+write`, `Contents: Read+write`,
   `Issues: Read+write`, `Pull requests: Read+write`, `Workflows: Read+write`
5. Set a calendar reminder 7 days before the 90-day expiry

## What this spec does NOT cover

- Cloudflare API tokens (separate spec under
  `docs/spec/frontend/cloudflare-pages.md`)
- Secret-store binding for the `GITHUB_TOKEN` used by the Pages Function
  (separate spec; deferred to Wave 1)
- Anthropic API keys (out of scope; classic plan/Max usage doesn't expose
  these here)

## Sources

- iter 1 of the autonomous orchestrator (Chrome MCP PAT creation)
- `gh auth status` output 2026-04-25 21:50 PDT
- `installs/prompts/github-pat-fine-grained.md` — reusable Chrome MCP setup
- GitHub docs:
  https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
