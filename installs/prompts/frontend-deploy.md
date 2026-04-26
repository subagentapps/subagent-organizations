---
name: frontend-deploy
intent: Deploy the live-artifact React/Vite app to Cloudflare Pages on subagentorganizations.com using Cloudflare Secret Store
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-sonnet-4-6 (medium)
description: Wires the live-artifact dashboard (polyrepo monitor) to Cloudflare Pages, using the user's existing subagentorganizations.com domain and Secret Store account at e6294e3ea89f8207af387d459824aaae. Three-environment setup (prod / staging / preview).
chains-to: [research-contextual-retrieval]
inputs:
  - cloudflare_account_id: e6294e3ea89f8207af387d459824aaae
  - secret_store_id: 565244614fc34be7aa8488ce46112f60
  - domain: subagentorganizations.com
output-shape: deployed Pages app + 1 spec file + 1 PR
---

# Cloudflare Pages deploy for the live-artifact dashboard

## Why

User owns `subagentorganizations.com` through Cloudflare. Goal: monitor
polyrepo GitHub Projects + Issues + PRs as a live artifact, with the same
agent-friendly mechanisms as the underlying repos. Secrets live in CF
Secret Store, not `.env` files.

## Pre-flight (NO writes; user-OK gated for any cloudflare/secret action)

1. Confirm domain + nameservers are on Cloudflare (`dig NS subagentorganizations.com`)
2. Check existing CF Pages projects: `wrangler pages project list 2>&1 || echo "wrangler not authed"`
3. Confirm Secret Store ID is reachable (visit URL in browser, or use API
   with user's confirmation)

## Approval gates that block this prompt

Per CLAUDE.md approval gates table:

- **Account creation** (cross-cloud) → blocked, user does it
- **Granting permissions** (Cloudflare API token scopes) → blocked
- **Sharing or forwarding confidential information** → never put the
  Secret Store contents in conversation
- **Cross-org writes** (creating pages projects under a personal CF account)
  → block on user OK

The right shape: this prompt produces a SPEC + a deploy script. The user
runs the deploy script themselves with their auth.

## Build artifact target

Single React/Vite SPA under `apps/live-artifact/` (created during
`promote-akw-context` via `akw-vite-scaffold.txt` rename), built to
`apps/live-artifact/dist/`, deployed to `subagentorganizations.com`.

## Three-environment plan (from staging/akw-step5-staging.txt)

| Environment | Branch | URL | Access |
|---|---|---|---|
| Production | `main` | `subagentorganizations.com` | public |
| Staging | `staging` | `staging.subagentorganizations.com` | CF Access (user's identity) |
| Preview | per-PR | `<sha>.subagentorganizations.pages.dev` | CF Access |

## Secret Store binding (the key innovation)

Instead of `.env`/`wrangler.toml` env vars, every secret is a binding:

```toml
# wrangler.toml
[secrets_store_secrets]
GITHUB_TOKEN = { store_id = "565244614fc34be7aa8488ce46112f60", secret_name = "GITHUB_TOKEN" }
ANTHROPIC_API_KEY = { store_id = "565244614fc34be7aa8488ce46112f60", secret_name = "ANTHROPIC_API_KEY" }
```

Pages Functions reference them as `env.GITHUB_TOKEN` etc. — never written
to disk, never in commit history, rotatable independently.

**User must populate the Secret Store entries themselves** before any
deploy will succeed. We can write the spec + the wrangler config; we
cannot insert secrets.

## Output of this prompt

1. `docs/spec/frontend/cloudflare-deploy.md` — the deploy spec
2. `apps/live-artifact/wrangler.toml` — the build/deploy config (no secrets,
   only Secret Store bindings)
3. `apps/live-artifact/scripts/deploy.sh` — the user-runs deploy command
4. PR with these three files

## See also

- `staging/2026-04-25-akw-artifact-context/akw-cf-pages-setup.txt` — original 211-line CF Pages setup
- `staging/2026-04-25-akw-artifact-context/akw-step5-staging.txt` — three-env plan
- [`./promote-akw-context.md`](./promote-akw-context.md) — must complete first
