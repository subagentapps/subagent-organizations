# `staging/` — read-only input area for polyrepo engineering

Status: load-bearing convention as of 2026-04-25 PST
Referenced from: `.claude/CLAUDE.md` convention #12
Companion to: [`../installs/prompts/README.md`](../installs/prompts/README.md)

## What this is

`staging/` is a **tmp area** for files copied in from outside the repo (other
working dirs, downloads, `cp` from sibling `claude-projects/*` folders). It's
the medallion-architecture **Bronze layer** for our polyrepo:

```
external source ──cp──> staging/<topic>/  ──promote──> docs/, src/, .claude/, etc.
   (untrusted)            (raw, frozen,             (trusted, structured,
                          read-only)                renamed, refactored)
```

## Why this exists

We have repeatedly hit the failure mode of *"the user gave us a large input;
we need to use it but reading the whole thing burns context."* `staging/` is
the rule that fixes it:

1. **`cp` once** the entire input into `staging/<topic>/` — this is a
   filesystem operation, zero token cost
2. **`ls`/`grep`/`head` selectively** to find what we need — small reads
3. **Promote** the relevant bits to their permanent home with renames and
   structural cleanup applied
4. **Keep the staging copy frozen** as an audit trail of "what we got told"

The alternative — reading 165 KB markdown into the conversation — torches the
context window for one task and leaves nothing for the next.

## Rules (the load-bearing list)

1. **Read-only after copy.** Once a file lands in `staging/`, never edit it.
   If you need to fix something, fix the *promoted* copy; the staging copy
   stays frozen so future iterations know what the original input looked like.
2. **Date-stamped subdirectories.** `staging/<YYYY-MM-DD>-<topic>/` — keeps
   provenance obvious. Multiple stagings of the same topic on different days
   live side-by-side.
3. **Rename on promote.** When promoting from `staging/` to a permanent
   location, apply project conventions: `agentknowledgeworkers` →
   `subagent-organizations`, `akw` → `subagent-orgs` (or the spelled-out form
   when prose), kebab-case → kebab-case, etc. Document the rename in the
   commit body.
4. **Selective reads.** Never `Read` a staged file with no `limit`/`offset`
   on the first pass. Use `wc -l`, `head`, `grep -n` via Bash to scope down.
5. **Clean up promotions, not stagings.** When the work is done, the
   promoted file lives at its real home; the staging copy STAYS as the
   audit trail. Remove a staging only if the entire topic is abandoned and
   you want to forget it cleanly.
6. **Tracked in git, not gitignored.** This is intentional: PR reviewers
   need to see what the inputs were. If a staging contains secrets, the
   right move is to redact before commit, not to gitignore.

## Naming convention

```
staging/
├── 2026-04-25-akw-artifact-context/      ← cp from /Users/alexzh/claude-projects/akw-artifact-context/
│   ├── PROVENANCE.md                     ← who copied, when, from where
│   ├── README.md                         ← short index of what's inside
│   └── … (raw input files)
└── 2026-04-25-expanded-directive/        ← user-provided multi-part prompt
    ├── PROVENANCE.md
    └── prompt-verbatim.md
```

Each staging directory **must** have `PROVENANCE.md` answering:

- Source path or URL
- Date copied
- Who/what process did the copy
- One-line summary of what's there
- Promotion plan (where each piece is destined to land)

## Contrast with `vendor/`

| Aspect | `staging/` | `vendor/` |
|---|---|---|
| Purpose | Inputs awaiting promotion | Audit-quality external snapshots |
| Lifecycle | Read once, promote, archive | Pinned forever, refresh on bump |
| Permissions | Filesystem-default, tracked | Read-only submodule (chmod 444 .gitmodules) |
| Source | Anywhere (sibling dirs, downloads) | GitHub remotes only |
| Rename allowed? | Yes, on promote | Never |
| Owner | Subject to project convention rewrites | Read-only mirror of upstream |

## Example: today's stagings

- `2026-04-25-akw-artifact-context/` — copy of `~/claude-projects/akw-artifact-context/`,
  the prior context for the knowledge-work-plugins-cli project (frontend +
  migration plan + ADRs + automation specs). Promotion plan: rename `akw` /
  `agentknowledgeworkers` → `subagent-organizations`, extract usable parts
  into `docs/spec/frontend/`, `docs/research/akw-decisions.md`, etc.
- `2026-04-25-expanded-directive/` — the user's multi-part prompt (vendor
  5 subagentapps repos, Cloudflare Pages, contextual-retrieval research, KB
  sources expansion). Promotion plan: decompose into chained prompts under
  `installs/prompts/`.

## Why not just `tmp/`?

Because `tmp/` implies "delete me." `staging/` implies "I'm in transit."
The audit trail matters: a future iteration needs to be able to ask "what
did the user originally give us?" and find a definitive answer.
