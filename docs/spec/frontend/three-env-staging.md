# Frontend: Three-environment setup with Cloudflare Access

Status: **draft** (Wave 0)
Source: `~/claude-projects/akw-artifact-context/akw-step5-staging.txt` (407 lines, frozen audit copy)

## Purpose

Industry-standard three-environment setup matching Anthropic /
Vercel / npm conventions. Production is public; staging + previews
require Cloudflare Access auth (admin-only).

## Environment table

| Env | Branch | URL | Access | Purpose |
|---|---|---|---|---|
| **Production** | `main` | `subagentorganizations.com` | Public | Live site |
| **Staging** | `staging` | `staging.subagentorganizations.com` | Cloudflare Access (you only) | Persistent pre-prod |
| **Preview** | any feature branch | `<branch>.subagent-organizations.pages.dev` | Cloudflare Access (you only) | Per-PR ephemeral testing |

## Promotion flow

```
feature/* → PR → preview URL
                  ↓ (review)
              merge to staging → staging URL
                                  ↓ (validate)
                              merge to main → production
```

## GitHub branch protection

`subagentapps/subagent-organizations` → Settings → Branches → Add rule:

**For `main`:**
- Require pull request before merging (approvals: 1)
- Require status checks: `build` (from `deploy.yml`)
- Require linear history
- Do not allow bypassing the above

**For `staging`:**
- Require pull request before merging (approvals: 0 — self-promotion OK)
- Require status checks: `build`
- Require linear history

## Updated `deploy.yml`

Replace the simpler one from [`./cloudflare-pages.md`](./cloudflare-pages.md)
with a three-env version that:

- Triggers on `push` to `main` AND `staging`, plus PRs to either
- Has a `concurrency` group keyed on `github.ref` so parallel pushes
  cancel earlier in-flight builds
- Type-checks via `tsc -b --noEmit` before build
- Sets `SNAPSHOT_SOURCE` env var at build time:
  - `staging` branch → `https://staging.subagentorganizations.com`
  - other branches → production URL (preview builds use prod data for stable demos)
- Calls `cloudflare/pages-action@v1` with `branch: ${{ github.ref_name }}`
  so Pages routes to the right environment

Full YAML at source `:32-138`.

## Cloudflare Pages branch behaviors

Cloudflare Pages → `subagent-organizations` → Settings → Builds & deployments:

- **Production branch**: `main`
- **Preview branch deployments**: enabled for `staging` AND every other
  branch with an open PR
- **Branch deployments URL pattern**: `<branch>.subagent-organizations.pages.dev`
  (this is the default; verify in dashboard)

## Staging subdomain DNS

Add to Cloudflare DNS for `subagentorganizations.com`:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `staging` | `staging.subagent-organizations.pages.dev` | Proxied |

Cloudflare Pages → Custom domains → add `staging.subagentorganizations.com`,
verify status: Active.

## Cloudflare Access — gate staging + previews

**One-time** Cloudflare Zero Trust setup:

1. CF dashboard → **Zero Trust**
2. Pick a team name (e.g. `subagentapps`) — only matters for the
   `<team>.cloudflareaccess.com` URL
3. Pick the free plan (50 users) — sufficient for solo + small team

**Identity provider**: enable **One-time PIN** as the simplest provider
(emails the user a 6-digit code). Add **GitHub OAuth** as a second
provider for convenience (optional).

**Access Application for staging**:

1. Zero Trust → **Access** → **Applications** → **Add an application**
2. Type: **Self-hosted**
3. App name: `subagent-organizations staging`
4. Application domain: `staging.subagentorganizations.com`
5. Session duration: 24h
6. Identity providers: One-time PIN + GitHub
7. **Add policy**:
   - Name: `admin-only`
   - Action: `Allow`
   - Include: `Emails: <admin email(s)>`

**Gate the preview URLs too**: add a second Access Application with
domain pattern `*.subagent-organizations.pages.dev` so every preview
deploy is auth-walled.

**Whitelist the Pages Functions API paths**: the `/api/*` routes need to
be reachable by the public dashboard for production, BUT only by
authenticated users for staging. The simplest pattern: scope the staging
Access Application to `staging.subagentorganizations.com/*` (covers both
HTML and `/api/*`); the production Pages app has no Access policy.

## Local staging simulation

`.env.local` (gitignored, for local dev only):

```
VITE_API_BASE=https://staging.subagentorganizations.com
```

This makes `bun run dev` proxy `/api/*` calls to staging instead of
production. Useful for testing Pages Function changes without deploying.

## Branch workflow

```bash
# Feature work
git checkout -b feat/my-feature main
# … commits …
git push -u origin feat/my-feature
gh pr create --base staging   # PR targets staging, not main
# Preview URL appears in PR comment

# Merge feature → staging (auto-deploys staging.subagentorganizations.com)
gh pr merge --squash

# Validate on staging URL, then promote to prod
gh pr create --base main --head staging --title "release: <description>"
gh pr merge --squash    # production deploys
```

## Out of scope

- Multi-region deploys (CF Pages handles this transparently)
- Per-PR comment automation (CF Pages does this by default)
- Rollback procedures (use `wrangler pages deployment rollback` — separate spec)
- Synthetic monitoring on production (use a separate uptime checker)

## Naming rename applied (vs source)

| Source | This spec |
|---|---|
| `agentknowledgeworkers.com` | `subagentorganizations.com` |
| `staging.agentknowledgeworkers.com` | `staging.subagentorganizations.com` |
| `<branch>.agentknowledgeworkers.pages.dev` | `<branch>.subagent-organizations.pages.dev` |
| `agentknowledgeworkers/agentknowledgeworkers` (repo) | `subagentapps/subagent-organizations` |

## Sources

- `~/claude-projects/akw-artifact-context/akw-step5-staging.txt`
- Cloudflare Zero Trust: <https://developers.cloudflare.com/cloudflare-one/>
- Cloudflare Access: <https://developers.cloudflare.com/cloudflare-one/applications/>
