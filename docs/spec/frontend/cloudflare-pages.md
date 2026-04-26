# Frontend: Cloudflare Pages deploy

Status: **draft** (Wave 0)
Source: `~/claude-projects/akw-artifact-context/akw-cf-pages-setup.txt` (211 lines, frozen audit copy)
Domain: `subagentorganizations.com` (user-owned via Cloudflare)
Account ID: `e6294e3ea89f8207af387d459824aaae`

## Purpose

Deploy the live-artifact dashboard ([`./vite-scaffold.md`](./vite-scaffold.md))
to Cloudflare Pages with a custom domain, KV cache for the GitHub Project
data fetcher ([`./live-data.md`](./live-data.md)), and three deploy
environments per [`./three-env-staging.md`](./three-env-staging.md).

## Deploy strategy

**Two viable options** documented in source; we pick **Option B (GitHub
Actions)** as the canonical path:

| Option | Trigger | Pros | Cons |
|---|---|---|---|
| A. Cloudflare auto-deploy | CF watches Git | Zero config | Less control over deploy gating, no CI integration |
| B. **GitHub Actions** | `push to main` + PR | CI gates, env secrets, audit trail | Slight setup overhead |

After the first CF-driven build (used to verify the project builds), we
**disable CF auto-deploy** and drive all deploys from `.github/workflows/deploy.yml`.

## One-time Cloudflare setup (manual; not auto-promotable)

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick `subagentapps/subagent-organizations`
3. Build config:
   - Framework preset: `Vite`
   - Build command: `bun run build` (or `npm run build` if bun unavailable in CF runner)
   - Build output: `dist`
   - Root directory: `src/apps/live-artifact`
   - Env vars: `NODE_VERSION=20`
4. After first successful CF-driven build, **disable** automatic deploys
   (Settings → Builds & deployments → uncheck Automatic deployments)
5. Add custom domain `subagentorganizations.com` and `www.subagentorganizations.com`

## Required `wrangler.toml`

```toml
name = "subagent-organizations"
compatibility_date = "2026-04-22"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

# KV namespace for the GitHub data cache.
# Provision with: wrangler kv namespace create SUBAGENT_CACHE
# Then uncomment and paste the ID:
# [[kv_namespaces]]
# binding = "SUBAGENT_CACHE"
# id = "<<paste-id-from-wrangler-output>>"

[vars]
ENVIRONMENT = "production"

[env.preview.vars]
ENVIRONMENT = "preview"
```

## Required `.github/workflows/deploy.yml`

Lives at `src/apps/live-artifact/.github/workflows/deploy.yml`. Triggers on
push to `main`, every PR, and manual dispatch. Deploys built `dist/` via
`cloudflare/pages-action@v1` to the `subagent-organizations` Pages project.

Key required steps (full YAML in source `akw-cf-pages-setup.txt:55-143`):

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: '20'`
3. `bun install` (or `npm ci`)
4. `bun run build`
5. `cloudflare/pages-action@v1` with:
   - `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`
   - `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`
   - `projectName: subagent-organizations`
   - `directory: dist`
   - `gitHubToken: ${{ secrets.GITHUB_TOKEN }}`

## Required GitHub repo secrets

| Secret | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template; scope to account + zone |
| `CLOUDFLARE_ACCOUNT_ID` | Right sidebar on any Cloudflare zone page (= `e6294e3ea89f8207af387d459824aaae`) |

**Future**: migrate these to **Cloudflare Secret Store** binding (account
secret store id `565244614fc34be7aa8488ce46112f60`) so secrets are
rotatable without GitHub Actions re-config. Tracked separately.

## DNS setup

In Cloudflare DNS for `subagentorganizations.com`:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `subagent-organizations.pages.dev` | Proxied |
| CNAME | `www` | `subagent-organizations.pages.dev` | Proxied |

Cloudflare Pages → Custom domains → verify both show **Active**.

## Preview deploys

Every PR gets a preview URL posted as a PR comment. URL persists for the
life of the PR and updates on each push. Merging to `main` → production.

## First-deploy checklist (manual gate)

- [ ] Cloudflare Pages: connect repo, first build succeeds from CF-driven deploy
- [ ] Grab `.pages.dev` URL, confirm dashboard renders
- [ ] Disable CF auto-deploy
- [ ] Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets to GitHub
- [ ] Paste `.github/workflows/deploy.yml`, push, confirm Actions builds + deploys
- [ ] Confirm Actions-driven deploy hits the same `.pages.dev` URL
- [ ] Add custom domain `subagentorganizations.com`, update DNS
- [ ] Verify Cloudflare Universal SSL is on (default; usually minutes)

## Out of scope

- KV namespace provisioning + cache invalidation strategy → see [`./live-data.md`](./live-data.md)
- Three-env (staging/preview/prod) split → see [`./three-env-staging.md`](./three-env-staging.md)
- Cloudflare Access auth → see [`./three-env-staging.md`](./three-env-staging.md)

## Commit-scope conventions (this app)

Per Conventional Commits + the source's recommended scopes:

- `feat(tracker): add sprint swim-lane toggle`
- `fix(field): braille field flickers on resize`
- `chore(deploy): bump wrangler action`
- `docs(readme): document local dev flow`
- Scopes: `tracker`, `field`, `api`, `deploy`, `docs`, `plugins`, `adr`

## Naming rename applied (vs source)

| Source | This spec |
|---|---|
| `agentknowledgeworkers/agentknowledgeworkers` repo | `subagentapps/subagent-organizations` |
| `agentknowledgeworkers.com` | `subagentorganizations.com` |
| `agentknowledgeworkers.pages.dev` | `subagent-organizations.pages.dev` |
| Pages project name `agentknowledgeworkers` | `subagent-organizations` |
| KV binding `AKW_CACHE` | `SUBAGENT_CACHE` |
| `wrangler.toml name = "agentknowledgeworkers"` | `name = "subagent-organizations"` |

## Sources

- `~/claude-projects/akw-artifact-context/akw-cf-pages-setup.txt`
- Cloudflare Pages: <https://developers.cloudflare.com/pages/>
- Cloudflare KV: <https://developers.cloudflare.com/kv/>
