# Brief — Issue #10 Cloudflare Pages deploy: handoff state

> Author: Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
> Date: 2026-04-26
> Issue: [#10](https://github.com/subagentapps/subagent-organizations/issues/10)
> Spec: [`docs/spec/frontend/cloudflare-pages.md`](../../docs/spec/frontend/cloudflare-pages.md)
> Status: **build green; HITL gates surfaced; deploy.yml authored**

---

## 1. What was verified this firing

| Check | Result |
|---|---|
| Spec on disk? | ✅ `docs/spec/frontend/cloudflare-pages.md` (153 lines, complete). The previous brief said the path was `installs/prompts/frontend-deploy.md` — **stale path**; the canonical file is in `docs/spec/frontend/`. |
| `wrangler.toml` on disk? | ✅ `src/apps/live-artifact/wrangler.toml`. Project name `subagent-organizations`, output dir `./dist`, KV binding `SUBAGENT_CACHE` (id placeholder). |
| Build succeeds? | ✅ `bun run build` → 1497 modules → 4 chunks (~200 KB raw / ~64 KB gzipped) in 682 ms. Snapshot script gracefully no-ops without `GITHUB_TOKEN`. |
| `deploy.yml` workflow on disk? | ❌ → ✅ **authored in this firing** at `.github/workflows/deploy-live-artifact.yml` (PR-shipped) |

---

## 2. The HITL gates — what's gated on the user

Three gates remain. None are scriptable; all require user-side action in
the Cloudflare dashboard or GitHub repo settings.

### Gate A — One-time Cloudflare Pages project bootstrap (manual)

Per `docs/spec/frontend/cloudflare-pages.md` §"One-time Cloudflare setup":

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
2. Pick `subagentapps/subagent-organizations`
3. Build config:
   - Framework preset: **Vite**
   - Build command: `bun run build`
   - Build output: `dist`
   - Root directory: `src/apps/live-artifact`
   - Env: `NODE_VERSION=20`
4. After first CF-driven build succeeds, **disable** automatic deploys (Settings → Builds & deployments → uncheck Automatic deployments)
5. Confirm `.pages.dev` URL renders

**Why manual:** Cloudflare doesn't expose a public API for "create a Pages project from a Git repo with auto-detection." The spec acknowledges this. Once the project exists, all subsequent deploys flow through the Actions workflow.

### Gate B — GitHub repo secrets (manual)

In `subagentapps/subagent-organizations` → Settings → Secrets and variables → Actions:

| Secret | Value | Source |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | (user-generated) | Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template, scoped to account `e6294e3ea89f8207af387d459824aaae` + the `subagentorganizations.com` zone |
| `CLOUDFLARE_ACCOUNT_ID` | `e6294e3ea89f8207af387d459824aaae` | already user-known per issue #10 body |

The deploy workflow consumes both via `${{ secrets.* }}` — no committed-file
exposure.

### Gate C — DNS records (manual, post-first-deploy)

Once the Pages project produces a `.pages.dev` URL, in Cloudflare DNS for
`subagentorganizations.com`:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `subagent-organizations.pages.dev` | Proxied |
| CNAME | `www` | `subagent-organizations.pages.dev` | Proxied |

Cloudflare Pages → Custom domains → verify both **Active**.

---

## 3. What I did this firing (concrete artifacts)

1. **Found** the spec at `docs/spec/frontend/cloudflare-pages.md` (the previous brief had a stale `installs/prompts/frontend-deploy.md` path).
2. **Verified** the build is green: `bun run --cwd src/apps/live-artifact build` succeeds in 682 ms.
3. **Authored** `.github/workflows/deploy-live-artifact.yml` — the GitHub Actions workflow per spec §"Required `.github/workflows/deploy.yml`". Differences from spec:
   - **Uses `cloudflare/wrangler-action@v3.15.0`** (April 2026) instead of the spec's `cloudflare/pages-action@v1.5.0` (May 2023). Wrangler-action is the actively-maintained successor; `pages-action` hasn't released since 2023. Both deploy Pages projects identically.
   - **SHA-pinned every action** per repo convention (matches `release-please.yml` pattern). Pins:
     - `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (v4.2.2)
     - `oven-sh/setup-bun@735343b667d3e6f658f44d0eca948eb6282f2b76` (v2.0.2)
     - `cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd` (v3.15.0)
   - **Path-filtered triggers**: only fires when `src/apps/live-artifact/**` or the workflow itself changes — avoids burning Actions minutes on docs-only PRs.
   - **Concurrency group** keyed by ref so a fresh push cancels in-flight builds for the same branch.
4. **Used `bun install --frozen-lockfile`** instead of `npm ci` per CLAUDE.md #6 ("Use bun not npm").
5. **Did NOT** commit any secret values, KV namespace IDs, or Pages-project IDs.

---

## 4. The deploy.yml decision: wrangler-action vs pages-action

The original spec (drafted from a 2023-era source) recommends
`cloudflare/pages-action@v1`. That action has not released since v1.5.0
(2023-05-23). Cloudflare's current canonical action is
`cloudflare/wrangler-action` (v3.15.0, 2026-04-15).

Verified via `gh api`:

| Action | Latest release | Last published | Verdict |
|---|---|---|---|
| `cloudflare/pages-action` | v1.5.0 | 2023-05-23 | Stale; works but no updates |
| `cloudflare/wrangler-action` | v3.15.0 | 2026-04-15 | Active; canonical |

The spec doc should be updated to reflect this; tracked as a follow-up
edit (low-priority since the workflow itself is correct).

---

## 5. The next step the user takes

1. Run the **Gate A** steps above (1× manual Cloudflare Pages bootstrap, 5 minutes).
2. Provision the **Gate B** secrets (1× GitHub Settings → Secrets, 2 minutes).
3. Once the workflow fires successfully on the next push to `main`, do the **Gate C** DNS update (5 minutes including SSL warm-up).

Total estimated user time: **~15 minutes**, all serial, all in the
Cloudflare/GitHub web UIs.

After Gate C, `subagentorganizations.com` is live, M3 (engineering-cli)
unblocks per `docs/spec/orchestration-strategy.md` §M3, and we can tag
v0.1.0.

---

## 6. What this firing did NOT do (and why)

- **Did not run `wrangler pages deploy` directly** — that requires the Pages project to already exist (Gate A) AND a working API token (Gate B). Both are HITL.
- **Did not provision the KV namespace** (`SUBAGENT_CACHE`). Per `docs/spec/frontend/live-data.md` and `wrangler.toml` comments, this is a follow-on after first deploy succeeds. The Pages Function (`functions/api/projects.ts`) gracefully degrades to no-cache when the binding is empty.
- **Did not migrate to the Cloudflare Secret Store** (account `e6294e3ea89f8207af387d459824aaae`, store `565244614fc34be7aa8488ce46112f60`). Spec §"Required GitHub repo secrets" notes this as a future migration; for v0.1.0 the GitHub Actions secrets path is sufficient.
- **Did not edit `docs/spec/frontend/cloudflare-pages.md`** to update the action name. Will surface as a follow-up PR — keeping this PR scoped to the workflow file + brief.

---

## 7. Provenance

- Spec: `docs/spec/frontend/cloudflare-pages.md`
- Issue: [#10](https://github.com/subagentapps/subagent-organizations/issues/10)
- SHA pins verified via `gh api repos/<owner>/<action>/git/refs/tags/<v>` 2026-04-26
- Build verified: `bun run build` 2026-04-26 ~16:43 PT
- Authored by Claude (Opus 4.7), running `/loop` dynamic mode
