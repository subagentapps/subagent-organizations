---
name: github-pat-fine-grained
intent: Create or rotate a fine-grained GitHub PAT for subagentapps via Chrome MCP, batching steps and avoiding live-filter pitfalls
version: 0.1.0
last-tested: 2026-04-25 (admin@jadecli.com, 30-day token expiring 2026-05-25 — see usage notes for what failed)
model-card-target: claude-sonnet-4-6 (medium) | claude-opus-4-7 (high) for first run only
description: Reusable workflow for the same PAT setup on any account (admin@jadecli.com today, alex@jadecli.com next, plus the 90-day rotation reminder). Encodes the lessons from the first run: live-filter footguns, ref invalidation, default expiration, click-vs-Escape semantics.
chains-to: []
inputs:
  - account_email: e.g. "admin@jadecli.com" or "alex@jadecli.com" — must already be logged into Chrome
  - resource_owner: e.g. "subagentapps" (the GitHub org)
  - token_name: kebab-case, dated, e.g. "subagentapps-cli-2026-04-25"
  - description: free-text purpose for the GitHub UI
  - expiration_days: 30 (GitHub default) or up to 366; we use 90 for routine rotation
  - repo_permissions: list of {name, level} — e.g. [{Contents, "Read and write"}, ...]
  - org_permissions: list of {name, level} — e.g. [{Projects, "Read and write"}, ...]
output-shape: a token visible to the user once on the GitHub success page; the user copies it manually into `gh auth login --with-token`. Claude never sees the token value.
---

# Fine-grained GitHub PAT — Chrome MCP scripted setup

## Why this prompt exists

We did this once interactively for `admin@jadecli.com` on 2026-04-25 and
hit several footguns (see "Lessons learned" below). Encoding the workflow
makes the same setup deterministic for:

1. **Today**: `admin@jadecli.com` (already in progress; this script is the
   future-resumable form)
2. **Soon**: `alex@jadecli.com` (the second account, once M3 ships per
   `docs/spec/orchestration-strategy.md`)
3. **90 days from any creation**: rotation. GitHub auto-revokes and the
   token disappears from the API; without rotation, the dogfood loop
   breaks silently.

## Pre-flight

Before invoking this prompt, the human must:

1. Be **logged in** to GitHub on Chrome under the target account
2. Have **Chrome MCP** active and the `mcp__claude-in-chrome__*` tools
   loaded via `ToolSearch`
3. Have the **inputs filled in** below (or accept the documented defaults)
4. **Confirm** they understand they (not Claude) will click the final
   "Generate token" button and copy the resulting token themselves —
   per CLAUDE.md user-privacy rules, Claude never sees, stores, or
   transmits the token value

## Default inputs (override per invocation)

```yaml
account_email: admin@jadecli.com   # change for alex@jadecli.com
resource_owner: subagentapps
token_name: subagentapps-cli-{YYYY-MM-DD}   # e.g. subagentapps-cli-2026-07-25
description: |
  Local gh + claude-code automation for the subagent-organizations dogfood
  orchestration plan. Scopes: Contents/Issues/Pull requests/Workflows R+W,
  Metadata RO (repo); Projects/Issue Fields/Issue Types/Custom properties
  R+W, Webhooks R+W, Members RO (org). Rotate every 90 days.
expiration_days: 90
repo_permissions:
  - { name: "Contents",       level: "Read and write" }
  - { name: "Issues",         level: "Read and write" }
  - { name: "Pull requests",  level: "Read and write" }
  - { name: "Workflows",      level: "Read and write" }
  # Metadata: Read-only is auto-required when any other repo perm is set;
  # do not list explicitly — GitHub adds it for you
org_permissions:
  - { name: "Projects",                          level: "Read and write" }
  - { name: "Issue Fields",                      level: "Read and write" }
  - { name: "Issue Types",                       level: "Read and write" }
  - { name: "Custom properties for organizations", level: "Read and write" }
  - { name: "Webhooks",                          level: "Read and write" }
  - { name: "Secrets",                           level: "Read and write" }
  - { name: "Variables",                         level: "Read and write" }
  - { name: "Members",                           level: "Read-only" }
```

## Step-by-step (the chain)

**Step 0 — Verify Chrome MCP + load tools**

```
ToolSearch query="select:mcp__claude-in-chrome__tabs_context_mcp,
                          mcp__claude-in-chrome__tabs_create_mcp,
                          mcp__claude-in-chrome__navigate,
                          mcp__claude-in-chrome__read_page,
                          mcp__claude-in-chrome__find,
                          mcp__claude-in-chrome__form_input,
                          mcp__claude-in-chrome__computer"
```

Then `tabs_context_mcp(createIfEmpty: true)` and `tabs_create_mcp()` →
record the new `tabId`.

**Step 1 — Navigate**

```
navigate(tabId, url: "https://github.com/settings/personal-access-tokens/new")
```

The page may show a sudo-mode "Confirm access" prompt. **STOP and ask
the user to authenticate** (Claude cannot type passwords). Resume only
after the user confirms.

**Step 2 — Fill name + description**

```
read_page(tabId, filter: "interactive")
form_input(ref: "<Token name>", value: token_name)
form_input(ref: "<Description>", value: description)
```

The token-name and description fields are usually `ref_24` and `ref_25`
on first read, but **always re-find** — GitHub re-numbers refs across
sessions.

**Step 3 — Pick resource owner**

```
left_click on "Resource owner" button   → opens dropdown
find("subagentapps option in resource owner picker")
left_click on the matching option
```

The picker collapses on selection. **Page re-renders here** — all refs
from before this click are now invalid. Re-read.

**Step 4 — Set expiration to 90 days**

GitHub's default is **30 days, NOT 90**. The first run forgot this and
shipped a 30-day token (May 25, 2026 instead of August 25, 2026).

```
find("expiration dropdown showing '30 days'")
left_click that button → opens menu with 7/30/60/90/Custom
find("90 days option in expiration menu")
left_click
```

If 90 isn't a preset, pick "Custom" and set the date 90 days out.

**Step 5 — Repository access = "All repositories"**

```
find("All repositories radio button (repository access section)")
left_click
```

This radio sometimes lives at `ref_29` initially but moves after the
resource-owner pick. Always re-find.

**Step 6 — Add repository permissions (the live-filter footgun zone)**

`find("Repositories permissions tab/button (the one labeled 'Repositories')")` →
click it.

Then for **each** entry in `repo_permissions`:

```
find("Add permissions button (in the Repositories tab)")
left_click   # opens the "Select repository permissions" dialog

# CRITICAL: do NOT type into the search box. The live-filter
# auto-checks ANY visible permission whose name starts with what
# you typed, so "Pull" toggles both "Pull requests" AND "Pages",
# and "Pro" toggles both "Projects" AND adjacent items.
#
# Instead: scroll the listbox by repeated `find("<exact perm name>
# checkbox in repo permissions dialog")` and click each one.

find("<perm.name> checkbox in repo permissions dialog")
left_click

key("Escape")   # close the add dialog without committing extras
```

**Step 7 — Flip access levels to "Read and write" (or whatever's in input)**

For **each** entry where `level != "Read-only"` (which is the GitHub
default after add):

```
find("Read-only access dropdown button on the <perm.name> permission row")
left_click   # opens a small floating menu with "Read-only" / "Read and write"
find("'Read and write' menu option in the open access level dropdown")
left_click
```

**Refs invalidate after every dropdown click.** Re-find each row.

**Step 8 — Org permissions (Organizations tab)**

```
find("Organizations tab button next to Repositories tab in Permissions")
left_click
```

For each `org_permissions` entry, repeat the **Step 6 + Step 7** pattern.

**The Custom Properties + Issue Fields + Issue Types triplet** is
specifically what GitHub calls "custom issues" data; if the user asks
for "custom issues access," that means all three.

**Step 9 — Verify before generate**

```
key("Escape")   # ensure no add-dialog is open
mcp__claude-in-chrome__computer(action: "screenshot")
```

Compare the screenshot against `repo_permissions` + `org_permissions`.
Surface the diff to the user.

**Stop here.** Do NOT click "Generate token" yourself.

**Step 10 — Hand off**

Tell the user verbatim:

> Ready to generate. The screenshot shows N repository permissions and
> M organization permissions matching your input list. Please:
>
> 1. Verify the page looks right
> 2. Click the green **Generate token** button at the bottom yourself
> 3. Copy the displayed token (it's shown only once)
> 4. In a terminal: `gh auth login --with-token` and paste at the
>    prompt, OR `echo "<token>" | gh auth login --with-token`
> 5. Tell me when done; I'll verify scopes via `gh auth status` and
>    `gh api graphql` against Projects v2

**Step 11 — Verify post-creation**

After the user reports the token is loaded:

```bash
gh auth status   # should show the new token + scopes
gh api graphql -f query='
  { viewer { login } }
'   # sanity check
gh api graphql -f query='
  { organization(login: "subagentapps") {
      projectsV2(first: 5) { totalCount nodes { number title } }
    }
  }
'   # the load-bearing scope (read:project) — must succeed without INSUFFICIENT_SCOPES
```

If `INSUFFICIENT_SCOPES` returns, the user added the token but the
Projects permission didn't actually persist. Re-screenshot the form
state and reconcile.

## Lessons learned from the first run (2026-04-25 admin@jadecli.com)

1. **Live-filter footgun.** Typing "Contents" in the repo-perm search
   auto-checked Contents AND Pull requests AND ~6 unwanted siblings
   (Actions, Agent tasks, Artifact metadata, Environments, Merge queues,
   Pages). Cleanup took 6 extra clicks.
   → **Fix:** Click-by-find, never type-into-search. Encoded above.

2. **Refs invalidate aggressively.** After clicking the resource-owner
   picker, every previous `ref_N` was stale. After clicking a Read-only
   dropdown, the dropdown's own button ref was stale on the next find.
   → **Fix:** `find` re-runs as the unit of work between any state
   change. Encoded above.

3. **Default expiration was 30, not 90.** First run shipped a 30-day
   token unintentionally.
   → **Fix:** Step 4 makes the 90-day setting explicit + checked.

4. **Projects is org-level, not repo-level.** The first run looked for
   Projects in the Repositories tab, didn't find it, then realized it
   was on Organizations.
   → **Fix:** Step 8 puts Projects under Organizations explicitly.

5. **Adding org Projects auto-toggled adjacent org perms** (Custom
   properties, Issue Fields, Issue Types, Webhooks) because the dialog
   was searched for "Pro..." mid-typing.
   → **Fix:** Same as #1 — click-by-find only.

6. **Esc closes the dialog cleanly.** Click-outside can sometimes
   re-open the dialog (we observed this). Use Esc.

7. **Projects access defaulted to Admin, not Read+write.** GitHub gives
   the "highest level" by default for org-level permissions in some
   cases. Step 7 covers this — always check actual access level after
   add.

## Calendar / rotation

Each token has a hard expiry. Set a calendar reminder when the token is
created:

- Anthropic `/schedule` (cloud, durable) — best fit; survives session close
- Apple Calendar event 7 days before expiry — fallback

**Naming**: token_name encodes creation date so listing tokens chronologically
makes rotation obvious:

```
gh api /user/tokens   # lists; rotate the oldest first
```

## Anti-patterns

- DO NOT type partial permission names in the dialog search box —
  live-filter will auto-check
- DO NOT click outside the add-dialog to close it — use Escape
- DO NOT reuse `ref_N` values across `find` calls — they invalidate
- DO NOT trust the default expiration — explicitly set 90 days
- DO NOT skip step 11 — the silent failure mode is "token created but
  scope missing" and it bites at the worst time

## See also

- [`./README.md`](./README.md) — prompt-collection format
- [`../../docs/spec/orchestration-strategy.md`](../../docs/spec/orchestration-strategy.md)
  §4 — why we need read:project,project for M2
- GitHub docs:
  - https://docs.github.com/rest/overview/permissions-required-for-fine-grained-personal-access-tokens
  - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
