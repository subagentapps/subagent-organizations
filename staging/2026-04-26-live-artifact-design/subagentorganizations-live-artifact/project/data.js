/* ============================================================
   Sample data — polyrepo issues + milestones + ADRs + changelog
   ============================================================ */

window.PLUGINS = [
  "productivity-cli",
  "product-management-cli",
  "data-cli",
  "platform-engineering",
  "it-admin",
  "engineering-cli",
  "schema",
  "meta-repo",
];

window.PLUGIN_LABEL = {
  "productivity-cli":       "productivity",
  "product-management-cli": "pm",
  "data-cli":               "data",
  "platform-engineering":   "platform",
  "it-admin":               "it-admin",
  "engineering-cli":        "engineering",
  "schema":                 "schema",
  "meta-repo":              "meta",
};

/* Per-plugin "velocity" — closed issues last 30 days × points-ish.
   Numbers above 100% mean the team is shipping faster than plan. */
window.PLUGIN_VELOCITY = {
  "productivity-cli":       267,
  "product-management-cli":  92,
  "data-cli":               138,
  "platform-engineering":   210,
  "it-admin":                74,
  "engineering-cli":        184,
  "schema":                 312,
  "meta-repo":              156,
};

/* ============================================================
   Issues (kanban + per-plugin tree)
   ============================================================ */
window.SAMPLE_ISSUES = [
  { number: 142, title: "Streaming response handler for long-running agent tasks", repo: "subagentorganizations/productivity-cli", plugin: "productivity-cli", status: "In Progress", priority: "P0", wave: "Wave 1", effort: "M", assignee: "kp", url: "#" },
  { number:  87, title: "Document polyrepo bootstrap script and ADR-0006",        repo: "subagentorganizations/meta-repo",         plugin: "meta-repo",        status: "In Progress", priority: "P1", wave: "Wave 1", effort: "S", assignee: "jl", url: "#" },
  { number:  56, title: "product-management-cli: Linear sync — initial spike",    repo: "subagentorganizations/product-management-cli", plugin: "product-management-cli", status: "In Progress", priority: "P1", wave: "Wave 1", effort: "L", assignee: "rm", url: "#" },
  { number:  31, title: "Extract shared Issue type into @sao/schema package",     repo: "subagentorganizations/schema",            plugin: "schema",           status: "In Review",   priority: "P0", wave: "Wave 0", effort: "S", assignee: "kp", url: "#" },
  { number: 144, title: "engineering-cli: implement `repo branch-protect` cmd",   repo: "subagentorganizations/engineering-cli",   plugin: "engineering-cli",  status: "In Review",   priority: "P1", wave: "Wave 1", effort: "M", assignee: "kp", url: "#" },
  { number: 211, title: "data-cli: paginate Projects v2 query past 100 items",    repo: "subagentorganizations/data-cli",          plugin: "data-cli",         status: "Todo",        priority: "P0", wave: "Wave 1", effort: "M", assignee: null, url: "#" },
  { number:  64, title: "Wire CF Access JWT verification into Pages Function",    repo: "subagentorganizations/platform-engineering", plugin: "platform-engineering", status: "Todo",   priority: "P1", wave: "Wave 1", effort: "L", assignee: "rm", url: "#" },
  { number:  19, title: "it-admin: Okta SCIM provisioning playbook",              repo: "subagentorganizations/it-admin",          plugin: "it-admin",         status: "Todo",        priority: "P2", wave: "Wave 2", effort: "L", assignee: null, url: "#" },
  { number: 198, title: "Add `--json` output flag across all CLIs (RFC-stage)",   repo: "subagentorganizations/meta-repo",         plugin: "meta-repo",        status: "Todo",        priority: "Stretch", wave: "Future", effort: "XL", assignee: null, url: "#" },
  { number:   8, title: "Initial repo scaffolding + CODEOWNERS + branch protections", repo: "subagentorganizations/meta-repo",     plugin: "meta-repo",        status: "Done",        priority: "P0", wave: "Wave 0", effort: "S", assignee: "jl", url: "#" },
  { number:  22, title: "Replace ad-hoc git wrapper with libgit2 bindings",       repo: "subagentorganizations/engineering-cli",   plugin: "engineering-cli",  status: "Done",        priority: "P1", wave: "Wave 0", effort: "M", assignee: "kp", url: "#" },
  { number:  41, title: "schema: GraphQL fragment for ProjectV2 fields",          repo: "subagentorganizations/schema",            plugin: "schema",           status: "Done",        priority: "P0", wave: "Wave 0", effort: "S", assignee: "kp", url: "#" },
  { number: 103, title: "Deprecate v0 polling worker in favor of webhooks",       repo: "subagentorganizations/platform-engineering", plugin: "platform-engineering", status: "Won't do", priority: "P2", wave: "Future", effort: "XL", assignee: null, url: "#" },
  { number:  77, title: "Rename `agent` → `subagent` across all CLIs",            repo: "subagentorganizations/meta-repo",         plugin: "meta-repo",        status: "Won't do",    priority: "Stretch", wave: "Future", effort: "XL", assignee: null, url: "#" },
];

/* ============================================================
   Per-plugin milestone trees (Plugin route)
   ============================================================ */
window.PLUGIN_DETAIL = {
  "productivity-cli": {
    description: "Tasks, memory, coordination. Dogfooded to run this very project.",
    summary: { milestones: 3, issues: 14, tasks: 38, done: 22 },
    target: "2026-06-15",
    status: "in_progress",
    milestones: [
      { id: "M1", title: "Wave 0 · acceptance tests", due: "2026-04-30", status: "completed", pct: 100,
        issues: [
          { id: 12, title: "T1–T4 manifest + frontmatter lint", state: "closed", sprint: "S1", pr: "#13", tasks: [
            { id: "T-0a1", title: "T1: manifest validity check", status: "completed", tool: "Bash" },
            { id: "T-0a2", title: "T2: skill frontmatter lint", status: "completed", tool: "Bash" },
            { id: "T-0a3", title: "T3: command frontmatter lint", status: "completed", tool: "Bash" },
            { id: "T-0a4", title: "T4: MCP reachable", status: "completed", tool: "Bash" },
          ]},
          { id: 18, title: "T5–T8 functional + docs", state: "closed", sprint: "S1", pr: "#19", tasks: [
            { id: "T-0a5", title: "T5: skills fire on triggers", status: "completed", tool: "Bash" },
            { id: "T-0a6", title: "T6: commands on fixtures", status: "completed", tool: "Bash" },
          ]},
        ]
      },
      { id: "M2", title: "Wave 1 · streaming + memory", due: "2026-05-30", status: "in_progress", pct: 55,
        issues: [
          { id: 142, title: "Streaming response handler for long-running tasks", state: "open", sprint: "S2", pr: "#143", tasks: [
            { id: "T-0b1", title: "Define stream protocol (SSE vs ndjson)", status: "completed", tool: "Write" },
            { id: "T-0b2", title: "Implement async iterator on client", status: "in_progress", tool: "Edit" },
            { id: "T-0b3", title: "Backpressure + cancellation", status: "pending", tool: "Edit" },
            { id: "T-0b4", title: "Integration test against fixture agent", status: "pending", tool: "Bash" },
          ]},
          { id: 156, title: "Persistent memory store: SQLite + WAL", state: "open", sprint: "S3", pr: null, tasks: [
            { id: "T-0c1", title: "Schema migration runner", status: "pending", tool: "Write" },
            { id: "T-0c2", title: "Crash-recovery test", status: "pending", tool: "Bash" },
          ]},
        ]
      },
      { id: "M3", title: "Wave 2 · multi-agent coordination", due: "2026-06-15", status: "queued", pct: 0,
        issues: [
          { id: 201, title: "Sub-agent spawn + lifecycle messaging", state: "open", sprint: "S4", pr: null, tasks: [] },
        ]
      },
    ]
  },
  "schema": {
    description: "Shared types + GraphQL fragments. Foundation everything else imports.",
    summary: { milestones: 2, issues: 9, tasks: 24, done: 24 },
    target: "2026-05-10",
    status: "completed",
    milestones: [
      { id: "M1", title: "v1 · GraphQL fragments", due: "2026-04-22", status: "completed", pct: 100,
        issues: [
          { id: 41, title: "ProjectV2 fragment", state: "closed", sprint: "S0", pr: "#42", tasks: [
            { id: "T-s1", title: "Field selection vs Items", status: "completed", tool: "Write" },
            { id: "T-s2", title: "Codegen → @sao/schema", status: "completed", tool: "Bash" },
          ]},
          { id: 31, title: "Extract Issue type", state: "open", sprint: "S1", pr: "#33", tasks: [
            { id: "T-s3", title: "Move from data-cli/types.ts", status: "completed", tool: "Edit" },
            { id: "T-s4", title: "Re-export from @sao/schema", status: "in_progress", tool: "Edit" },
          ]},
        ]
      },
      { id: "M2", title: "v2 · runtime validation (zod)", due: "2026-05-10", status: "queued", pct: 0,
        issues: []
      },
    ]
  },
};

/* ============================================================
   ADRs
   ============================================================ */
window.ADRS = [
  { number: "0001", title: "Polyrepo over monorepo", status: "Accepted", date: "2026-03-12",
    body: `# ADR-0001 · Polyrepo over monorepo

## Status
**Accepted** — 2026-03-12 · supersedes nothing

## Context

We considered three layouts for the eight plugin CLIs plus the schema and meta tooling: a single \`Nx\`/\`Turborepo\` monorepo, a polyrepo with shared \`@sao/schema\`, or a hybrid with a meta-repo holding tooling and per-plugin repos for code.

The plugins ship at very different cadences. \`schema\` releases roughly weekly; \`it-admin\` is closer to monthly. A monorepo couples their version trains and forces every plugin team to own the build graph.

## Decision

Adopt **polyrepo with a thin meta-repo**. Each plugin lives at \`subagentorganizations/<plugin>-cli\`. Shared types live in \`subagentorganizations/schema\` and are consumed via npm. The \`meta-repo\` holds CI templates, branch-protection scripts, and ADRs.

## Consequences

- Each plugin owns its release cadence and CI.
- Cross-cutting refactors (e.g. renaming an Issue field) cost more — a coordinated PR train across N repos.
- The Pages Function in this artifact aggregates all eight repos via GraphQL, smoothing over the polyrepo split.

## Alternatives considered

1. **Nx monorepo.** Rejected: build-graph complexity outweighs the DX win at our scale.
2. **Hybrid (meta + per-plugin) with git submodules.** Rejected: submodules cause more pain than they solve.` },
  { number: "0002", title: "GraphQL via Cloudflare Pages Function", status: "Accepted", date: "2026-03-19",
    body: `# ADR-0002 · GraphQL via Cloudflare Pages Function

## Status
**Accepted** — 2026-03-19

## Context

The live artifact needs to fetch eight repos worth of issues and Project v2 state on every page load. Hitting GitHub directly from the browser exposes the token and burns rate-limit quota per visitor.

## Decision

A Cloudflare Pages Function at \`/api/projects\` proxies a single GraphQL query, holds a 5-minute KV cache, and verifies a CF Access JWT before serving. The token lives in CF Workers secrets.

## Consequences

- One round-trip per visitor instead of N.
- Cache TTL is configurable; staleness is acceptable for a tracker.
- Auth is handled at the edge — the React app never sees a token.` },
  { number: "0003", title: "Flat-dark visual language", status: "Accepted", date: "2026-04-02",
    body: `# ADR-0003 · Flat-dark visual language

## Status
**Accepted**

## Decision

Single accent color (cyan teal \`#5eead4\`); pure black/near-black surfaces; 1px borders only; no gradients, drop shadows, or rounded-corner skeuomorphism. Typography is a system stack with monospace for all identifiers and numbers.

## Rationale

The artifact is dense. Visual chrome competes with the data. Flat surfaces + monospace numbers + restrained color let the eye land on what changed — issues moving columns, milestones closing, velocity climbing — without parsing decoration.` },
  { number: "0004", title: "Hash-based router (no React Router)", status: "Accepted", date: "2026-04-08",
    body: `# ADR-0004 · Hash-based router (no React Router)

## Status
**Accepted**

## Decision

Use a 30-line hash router instead of React Router. The artifact has four routes; the bundle target is 100 KB gzipped; React Router is 18 KB just sitting there.` },
  { number: "0005", title: "Lucide for icons; nothing else", status: "Accepted", date: "2026-04-14",
    body: `# ADR-0005 · Lucide for icons; nothing else

## Status
**Accepted**

## Decision

Single icon dependency: \`lucide-react\`. No component libraries, no Radix, no Headless UI. Tailwind adoption is deferred until the design stabilizes; current styling is plain CSS with custom properties so the migration is mechanical.` },
  { number: "0006", title: "Plugin = repo (1:1)", status: "Proposed", date: "2026-04-22",
    body: `# ADR-0006 · Plugin = repo (1:1)

## Status
**Proposed** — 2026-04-22

## Context

Some plugins are small enough that a dedicated repo feels heavy. \`schema\` and \`meta-repo\` are not "plugins" in the user-facing sense.

## Decision (proposed)

We keep the 1:1 invariant: every name in the plugin enum is a repo at \`subagentorganizations/<name>\`. \`schema\` and \`meta-repo\` are honorary plugins for tracking purposes only.

## Open questions

- Do we expose \`schema\` and \`meta-repo\` in the public Plugins tab, or only on the internal dashboard?` },
];

/* ============================================================
   Changelog
   ============================================================ */
window.CHANGELOG = [
  { date: "2026-04-24", version: "v0.6.0",
    items: [
      { kind: "add",   plugin: "productivity-cli", text: "Streaming response handler (SSE) — issue #142, partial" },
      { kind: "add",   plugin: "engineering-cli",  text: "`repo branch-protect` command — closes #144" },
      { kind: "fix",   plugin: "data-cli",         text: "Pagination past 100 items now correctly cursors — #211 follow-up" },
      { kind: "docs",  plugin: "meta-repo",        text: "ADR-0006 drafted — plugin/repo 1:1 invariant" },
    ]},
  { date: "2026-04-17", version: "v0.5.2",
    items: [
      { kind: "add",   plugin: "schema",           text: "ProjectV2 fragment + codegen pipeline" },
      { kind: "fix",   plugin: "platform-engineering", text: "CF Access JWT verification — closes #64" },
      { kind: "break", plugin: "schema",           text: "`Issue.tags` renamed to `Issue.labels`; bump to 0.5" },
    ]},
  { date: "2026-04-10", version: "v0.5.1",
    items: [
      { kind: "add",   plugin: "engineering-cli",  text: "libgit2 bindings replace shell-wrapper — #22" },
      { kind: "docs",  plugin: "meta-repo",        text: "ADR-0003 (visual language) and ADR-0005 (icons) accepted" },
    ]},
  { date: "2026-04-03", version: "v0.5.0",
    items: [
      { kind: "add",   plugin: "meta-repo",        text: "Initial scaffolding, CODEOWNERS, branch protections — #8" },
      { kind: "add",   plugin: "platform-engineering", text: "Cloudflare Pages deploy target wired" },
    ]},
];
