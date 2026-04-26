# `.worktreeinclude`

**Location**: `<repo>/.worktreeinclude` (repo root)
**Commit?** Yes
**Loads**: On `git worktree add`

## What it does

Lists gitignored files Claude Code should *copy* (not symlink) into a new worktree.
Useful for `.env.local`, `node_modules/` cache markers, or any local file the project
needs but ignores.

## Shape

Plain text, one path per line, gitignore-style:

```
.env.local
.env.development
.dev.vars
.tool-versions
```

## When to use

- **Yes**: secrets-bearing files the gitignore excludes but every dev needs locally
- **No**: regenerable build artifacts (just rebuild in the worktree)
- **Especially yes**: Vercel/Cloudflare/Wrangler dev vars files (`.dev.vars`, `.env.local`)

## Related
- Claude Code worktrees workflow: https://code.claude.com/docs/en/common-workflows#copy-gitignored-files-to-worktrees
