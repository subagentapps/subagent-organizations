# The full suite: five plugins + a schema package

Revised monorepo:

```
knowledge-work-plugins-cli/
├── packages/
│   └── schema/                   # @anthropic-ai/kwpc-schema
│       ├── graphql/              # Shared GraphQL schema + queries
│       ├── lib/                  # Pure-bash clients (curl-based)
│       └── package.json
├── data-cli/                     # Terminal data analyst
├── productivity-cli/             # Personal task view + memory (NEW — ports Cowork productivity)
├── product-management-cli/       # Team coordination via GitHub Projects (NEW — ports Cowork PM)
├── platform-engineering/         # Plugin authoring + /stack-check
├── it-admin/                     # ant admin * wrapper
├── release-please-config.json
├── .release-please-manifest.json
└── .github/workflows/
```

The two Cowork plugins (`productivity`, `product-management`) get ported to `-cli` variants that swap:
- `dashboard.html` → GitHub Projects (the dashboard is already built by GitHub)
- `TASKS.md` local file → GitHub Issues filtered by `assignee:@me`
- Third-party MCPs (Linear/Asana/Atlassian) → GitHub API via GraphQL

Local `CLAUDE.md` + `memory/` stay — those are personal memory, not team state.

---

# 1. The schema: `packages/schema/`

## `packages/schema/package.json`

```json
{
  "name": "@anthropic-ai/kwpc-schema",
  "version": "0.1.0",
  "description": "Canonical GraphQL schema + curl-based clients for knowledge-work-plugins-cli. Maps Claude Code task primitives to GitHub Projects.",
  "repository": { "type": "git", "url": "https://github.com/anthropics/knowledge-work-plugins-cli", "directory": "packages/schema" },
  "license": "Apache-2.0",
  "publishConfig": { "access": "public" },
  "files": ["graphql", "lib", "README.md"]
}
```

## `packages/schema/graphql/canonical.graphql`

This is the authoritative shape of every unit of work the two PM plugins deal with. Every skill reads from or writes to one of these types.

```graphql
# Canonical schema for knowledge-work-plugins-cli
#
# These types are the Claude Code task primitives mapped onto GitHub Projects.
# - Task: a unit of work (GitHub Issue)
# - Spec: a feature spec (Issue with label:spec + body following the template)
# - Sprint: an iteration (Project iteration field)
# - RoadmapItem: a Task with Milestone and Status fields set
# - PinDrift: a Task opened by the pin-freshness workflow
# - DriftReport: Claude Code's internal report shape (not stored, emitted at runtime)

scalar DateTime
scalar URL
scalar SemVer

# ─── Enums mirror GitHub Project single-select fields ──────────────────────────

enum TaskStatus { BACKLOG NEXT IN_PROGRESS IN_REVIEW BLOCKED DONE }
enum Priority   { P0 P1 P2 P3 }
enum Severity   { LOW MEDIUM HIGH CRITICAL }
enum DriftType  { AHEAD BEHIND PINNED_AHEAD FRESH MISSING_REQUIRED }
enum Area       { DATA_CLI PRODUCTIVITY_CLI PRODUCT_MANAGEMENT_CLI PLATFORM_ENGINEERING IT_ADMIN SCHEMA META }

# ─── Core type ─────────────────────────────────────────────────────────────────

interface WorkItem {
  id:         ID!
  number:     Int!
  title:      String!
  body:       String
  url:        URL!
  status:     TaskStatus!
  priority:   Priority
  area:       Area!
  assignees:  [String!]!
  labels:     [String!]!
  milestone:  String
  createdAt:  DateTime!
  updatedAt:  DateTime!
  closedAt:   DateTime
}

type Task implements WorkItem {
  id: ID! number: Int! title: String! body: String url: URL!
  status: TaskStatus! priority: Priority area: Area!
  assignees: [String!]! labels: [String!]! milestone: String
  createdAt: DateTime! updatedAt: DateTime! closedAt: DateTime

  parent:    Task               # sub-task relationship (via `parent: #123` in body)
  children:  [Task!]!
  blockedBy: [Task!]!           # via `blocked by: #123`
}

type Spec implements WorkItem {
  id: ID! number: Int! title: String! body: String url: URL!
  status: TaskStatus! priority: Priority area: Area!
  assignees: [String!]! labels: [String!]! milestone: String
  createdAt: DateTime! updatedAt: DateTime! closedAt: DateTime

  # Spec-specific, parsed from body sections
  problem:        String!
  goals:          [String!]!
  nonGoals:       [String!]!
  userStories:    [UserStory!]!
  requirements:   [Requirement!]!
  successMetrics: [Metric!]!
  openQuestions:  [String!]!
}

type UserStory   { asA: String! iWant: String! soThat: String! }
type Requirement { title: String! priority: Priority! acceptanceCriteria: [String!]! }
type Metric      { name: String! target: String! leading: Boolean! }

type Sprint {
  id:          ID!
  name:        String!          # e.g. "kwpc-sprint-12"
  startDate:   DateTime!
  endDate:     DateTime!
  capacity:    Int              # story points or hour estimate
  items:       [WorkItem!]!
  goal:        String!
  retroUrl:    URL              # link to retro doc (GitHub Discussion)
}

type RoadmapItem {
  workItem:    WorkItem!
  bucket:      RoadmapBucket!   # Now / Next / Later
  theme:       String           # quarterly theme
  okrKey:      String           # links to an OKR key result
}
enum RoadmapBucket { NOW NEXT LATER }

# ─── Pin drift (where platform-engineering writes) ────────────────────────────

type PinDrift implements WorkItem {
  id: ID! number: Int! title: String! body: String url: URL!
  status: TaskStatus! priority: Priority area: Area!
  assignees: [String!]! labels: [String!]! milestone: String
  createdAt: DateTime! updatedAt: DateTime! closedAt: DateTime

  # Pin-specific, parsed from body
  dependency:       String!      # "ant", "claude-code", "duckdb"
  plugin:           Area!        # which plugin's pin drifted
  pinnedVersion:    SemVer!
  installedVersion: SemVer
  latestVersion:    SemVer!
  driftType:        DriftType!
  severity:         Severity!
  relevantEntries:  [String!]!   # filtered CHANGELOG bullets
  lastCheckedAt:    DateTime!
}

# ─── Queries (read-side) ───────────────────────────────────────────────────────

type Query {
  # Productivity-cli uses these
  myTasks(status: [TaskStatus!], area: [Area!]):      [Task!]!
  task(number: Int!):                                  Task
  waitingOn(assignee: String!):                        [Task!]!

  # Product-management-cli uses these
  spec(number: Int!):                                  Spec
  specs(status: [TaskStatus!]):                        [Spec!]!
  currentSprint(team: String!):                        Sprint
  roadmap(bucket: RoadmapBucket):                      [RoadmapItem!]!
  sprintHistory(team: String!, limit: Int = 5):        [Sprint!]!

  # Platform-engineering uses these
  openPinDrifts(plugin: Area, severity: [Severity!]):  [PinDrift!]!
  pinDrift(dependency: String!, plugin: Area!):        PinDrift
}

# ─── Mutations (write-side) ────────────────────────────────────────────────────

type Mutation {
  # Productivity-cli
  createTask(input: CreateTaskInput!):       Task!
  updateTaskStatus(number: Int!, status: TaskStatus!): Task!

  # Product-management-cli
  createSpec(input: CreateSpecInput!):       Spec!
  updateRoadmap(input: RoadmapUpdateInput!): [RoadmapItem!]!
  planSprint(input: SprintPlanInput!):       Sprint!

  # Platform-engineering
  reportPinDrift(input: PinDriftInput!):     PinDrift!   # upserts by (dependency, plugin)
  closePinDrift(number: Int!, reason: String): PinDrift!
}

input CreateTaskInput  { title: String! body: String area: Area! priority: Priority parent: Int }
input CreateSpecInput  { title: String! area: Area! problem: String! goals: [String!]! nonGoals: [String!] userStories: [UserStoryInput!] requirements: [RequirementInput!] }
input UserStoryInput   { asA: String! iWant: String! soThat: String! }
input RequirementInput { title: String! priority: Priority! acceptanceCriteria: [String!]! }
input RoadmapUpdateInput { number: Int! bucket: RoadmapBucket theme: String okrKey: String }
input SprintPlanInput  { name: String! startDate: DateTime! endDate: DateTime! capacity: Int goal: String! itemNumbers: [Int!]! }
input PinDriftInput    {
  dependency: String! plugin: Area!
  pinnedVersion: SemVer! installedVersion: SemVer latestVersion: SemVer!
  driftType: DriftType! severity: Severity!
  relevantEntries: [String!]!
}
```

## How the schema maps to GitHub

This is the translation table. Every field in the schema maps to something GitHub's GraphQL API already exposes — we're not inventing storage, we're curating a view.

| Schema type/field          | GitHub Projects representation                                               |
|----------------------------|------------------------------------------------------------------------------|
| `Task`                     | GitHub Issue                                                                 |
| `Task.status`              | Project single-select field named `Status`                                   |
| `Task.priority`            | Project single-select field named `Priority`                                 |
| `Task.area`                | Issue label matching `area/<plugin>`                                         |
| `Task.parent`              | Issue body line: `parent: #NNN`                                              |
| `Task.blockedBy`           | Issue body line: `blocked by: #NNN, #MMM`                                    |
| `Spec`                     | Issue with label `type/spec` + body following the spec template              |
| `Spec.problem`, `.goals`   | Parsed from markdown sections in Issue body (`## Problem`, `## Goals`)       |
| `Sprint`                   | Project iteration (GitHub Projects' built-in iteration field)                |
| `Sprint.items`             | Items in that iteration                                                      |
| `RoadmapItem.bucket`       | Project single-select field `Roadmap` with options Now/Next/Later            |
| `RoadmapItem.theme`        | Project text field `Theme`                                                   |
| `RoadmapItem.okrKey`       | Project text field `OKR`                                                     |
| `PinDrift`                 | Issue with labels `pin-drift`, `area/<plugin>`, `severity/<level>`           |
| `PinDrift.*` structured    | Parsed from the Issue body using the template in `platform-engineering/scripts/pin-drift-body.sh` |

The `area` enum appears three ways: as an issue label, as a project field, and as a directory prefix in CODEOWNERS. All three are kept in sync by the schema.

## `packages/schema/lib/graphql-client.sh`

Pure bash + curl, no `gh`, no Node, no Python. Sourced by every plugin that talks to GitHub.

```bash
#!/usr/bin/env bash
# GraphQL client for the knowledge-work-plugins-cli suite.
# Usage: source this file, then call kwpc_graphql <query-name> <variables-json>
#
# Required env:
#   GITHUB_TOKEN       — PAT with repo + project scope
#   KWPC_REPO_OWNER    — e.g. "anthropics"
#   KWPC_REPO_NAME     — e.g. "knowledge-work-plugins-cli"
#   KWPC_PROJECT_ID    — Project V2 node ID (get once with kwpc_project_id)

set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set}"
: "${KWPC_REPO_OWNER:?KWPC_REPO_OWNER must be set}"
: "${KWPC_REPO_NAME:?KWPC_REPO_NAME must be set}"

KWPC_SCHEMA_DIR="${KWPC_SCHEMA_DIR:-$(dirname "${BASH_SOURCE[0]}")/../graphql/queries}"

# Send a GraphQL operation by name, passing variables as a JSON string.
# The query file must live at $KWPC_SCHEMA_DIR/<name>.graphql.
#
# Example: kwpc_graphql myTasks '{"status":["IN_PROGRESS"]}'
kwpc_graphql() {
  local op="$1" vars="${2:-{\}}"
  local query_file="$KWPC_SCHEMA_DIR/$op.graphql"
  [[ -f "$query_file" ]] || { echo "unknown operation: $op" >&2; return 2; }

  local query payload
  query=$(jq -Rs . < "$query_file")
  payload=$(jq -cn --argjson q "$query" --argjson v "$vars" '{query:$q,variables:$v}')

  local response
  response=$(curl -sS -X POST https://api.github.com/graphql \
    -H "Authorization: bearer $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -H "GraphQL-Features: projects_next_graphql" \
    -d "$payload")

  # Surface errors to stderr, still return the response so callers can decide
  if echo "$response" | jq -e '.errors' > /dev/null 2>&1; then
    echo "$response" | jq '.errors' >&2
    return 1
  fi
  echo "$response"
}

# Convenience: extract .data directly
kwpc_graphql_data() {
  kwpc_graphql "$@" | jq '.data'
}

# Get the Project V2 node ID once and cache in env/file.
# Writes to .kwpc-project-id in cwd if the env var isn't set.
kwpc_project_id() {
  if [[ -n "${KWPC_PROJECT_ID:-}" ]]; then echo "$KWPC_PROJECT_ID"; return; fi
  if [[ -f .kwpc-project-id ]]; then cat .kwpc-project-id; return; fi

  local number="${KWPC_PROJECT_NUMBER:?KWPC_PROJECT_NUMBER required if KWPC_PROJECT_ID not set}"
  local result
  result=$(kwpc_graphql getProjectId "{\"owner\":\"$KWPC_REPO_OWNER\",\"number\":$number}")
  local id
  id=$(echo "$result" | jq -r '.data.organization.projectV2.id')
  [[ -z "$id" || "$id" == "null" ]] && { echo "project not found" >&2; return 1; }
  echo "$id" | tee .kwpc-project-id
}
```

## `packages/schema/graphql/queries/myTasks.graphql`

One file per operation. Every plugin reaches for these by name rather than duplicating queries inline — this is where schema drift gets prevented.

```graphql
query myTasks($statuses: [String!], $areas: [String!]) {
  viewer {
    login
    assignedIssues(first: 50, states: OPEN) {
      nodes {
        id number title body url createdAt updatedAt
        labels(first: 20) { nodes { name } }
        milestone { title }
        projectItems(first: 5) {
          nodes {
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldTextValue        { text field { ... on ProjectV2Field             { name } } }
              }
            }
          }
        }
      }
    }
  }
}
```

Other queries live alongside this one: `currentSprint.graphql`, `openPinDrifts.graphql`, `spec.graphql`, `roadmap.graphql`, `createTaskInProject.graphql`, `setStatusField.graphql`, `reportPinDrift.graphql`, `getProjectId.graphql`. Full list is in the schema; each is ~30 lines of GraphQL.

---

# 2. `productivity-cli`

Thin wrapper over `myTasks`, `createTask`, `updateTaskStatus`. Keeps the Cowork plugin's memory/CLAUDE.md pattern (that's personal) but replaces `TASKS.md` with live GitHub queries.

## `productivity-cli/.claude-plugin/plugin.json`

```json
{
  "name": "productivity-cli",
  "version": "0.1.0",
  "description": "Personal task view backed by GitHub Issues. CLAUDE.md + memory/ for personal shorthand; tasks come from assigned Issues in the kwpc project.",
  "author": { "name": "Anthropic" }
}
```

## `productivity-cli/commands/my-tasks.md`

```markdown
---
description: Show tasks assigned to you in the current kwpc project
allowed-tools: Bash(bash:*), Bash(jq:*), Bash(curl:*), Read
argument-hint: "[--status backlog|next|in-progress|blocked] [--area <plugin>]"
---

Source `${CLAUDE_PLUGIN_ROOT}/../packages/schema/lib/graphql-client.sh`.

Parse `$ARGUMENTS` for filters. Default: show everything not Done.

Call `kwpc_graphql_data myTasks "$variables_json"`.

Parse the response. For each task:
- Extract Status from `projectItems.fieldValues` where field.name == "Status"
- Extract Priority the same way
- Extract Area from labels matching `area/*`

Render as a terminal table via `column -t`:

```
#      STATUS        PRIORITY  AREA                    TITLE
#123   IN_PROGRESS   P1        platform-engineering    Wire /stack-check
#124   BACKLOG       P2        data-cli                Add --format csv to /analyze
#127   BLOCKED       P0        it-admin                Fix ant admin users delete flag
```

If the user passes `--mine-only-p0`, filter `priority: [P0]` before rendering.
```

## `productivity-cli/commands/task-add.md`

```markdown
---
description: Create a GitHub Issue for a new task, add to the kwpc project, assign to yourself
allowed-tools: Bash(bash:*), Bash(jq:*), Bash(curl:*), Read
argument-hint: "<title> [--area <plugin>] [--priority P0|P1|P2|P3] [--parent #NNN]"
---

Parse `$ARGUMENTS`.

If `--area` isn't given, infer from cwd (which plugin directory you're in).
If `--priority` isn't given, default to P2.

Source the schema client. Call the `createTaskInProject` mutation:

```bash
kwpc_graphql createTaskInProject "$(jq -cn \
  --arg title "$title" \
  --arg body  "$body" \
  --arg area  "$area" \
  --arg priority "$priority" \
  --arg repo "$KWPC_REPO_NAME" \
  --arg owner "$KWPC_REPO_OWNER" \
  --arg projectId "$(kwpc_project_id)" \
  '{title:$title, body:$body, area:$area, priority:$priority, repo:$repo, owner:$owner, projectId:$projectId}')"
```

The mutation does three things atomically: creates the Issue, adds it to the project, sets the Status/Priority/Area fields. One round trip.

Print the new Issue URL.
```

## `productivity-cli/skills/memory-management/SKILL.md`

Unchanged from the Cowork plugin — memory is personal, not team state. CLAUDE.md stays local. The only edit is the "Tasks" section of CLAUDE.md no longer references `TASKS.md`; it references the GitHub project.

```diff
 ## Projects
 | Name | What |
 |------|------|
 | **Phoenix** | DB migration, Q2 launch |
-→ Details: memory/projects/
+→ Details: memory/projects/, live status in GitHub project #<kwpc project number>
```

## What `productivity-cli` intentionally does NOT do

- No `dashboard.html` generation. If the user wants a dashboard, they open the GitHub project URL in a browser — that's the dashboard.
- No `TASKS.md` parsing. The source of truth is GitHub.
- No MCP dependencies on Slack/Asana/Linear. The Cowork version scanned chat and email for action items; the CLI version skips that. Engineers track their tasks in the same place they file them — GitHub.
- No `/update --comprehensive` scanning external tools. Replaced by `/drift` (below) which pulls pin-drift issues specifically.

---

# 3. `product-management-cli`

This is the team-coordination plugin. Every skill becomes a GraphQL query + a markdown renderer.

## `product-management-cli/.claude-plugin/plugin.json`

```json
{
  "name": "product-management-cli",
  "version": "0.1.0",
  "description": "Team coordination via GitHub Projects. Specs, roadmaps, sprint planning, stakeholder updates — all backed by the canonical schema.",
  "author": { "name": "Anthropic" }
}
```

## `product-management-cli/commands/write-spec.md` (the exemplar)

```markdown
---
description: Write a spec, create a GitHub Issue with type/spec label, structure body per the canonical schema
allowed-tools: Bash(bash:*), Bash(jq:*), Bash(curl:*), Read, Write
argument-hint: "<feature or problem statement>"
---

Args: `$ARGUMENTS`

Source the schema client.

## Step 1: Interview (conversational, see Cowork write-spec SKILL.md)

Gather: problem, target users, success metrics, constraints, prior art.

## Step 2: Generate the spec body

Produce markdown following the canonical schema's `Spec` type. The body is parseable by the schema parser because section headings map to GraphQL fields:

```markdown
## Problem
<Spec.problem>

## Goals
- <Spec.goals[0]>
- <Spec.goals[1]>

## Non-Goals
- <Spec.nonGoals[0]>

## User Stories
- As a <asA>, I want <iWant> so that <soThat>.

## Requirements

### P0 — Must Have
- <title>
  - Acceptance: <acceptanceCriteria>

### P1 — Should Have
- ...

## Success Metrics
- Leading: <name>, target <target>
- Lagging: <name>, target <target>

## Open Questions
- <question>
```

## Step 3: Create the Issue via GraphQL

```bash
kwpc_graphql createSpec "$(jq -cn \
  --arg title "$title" \
  --arg area  "$area" \
  --arg body  "$body" \
  --arg projectId "$(kwpc_project_id)" \
  '{title:$title, area:$area, body:$body, projectId:$projectId}')"
```

The mutation:
1. Creates an Issue with labels `type/spec` + `area/<area>` + `priority/P2`
2. Adds it to the kwpc project with Status=BACKLOG
3. Sets the Roadmap bucket to LATER by default (user can promote with `/roadmap-update`)

## Step 4: Confirm and hand back

```
Spec created: <url>
Labels: type/spec, area/<area>, priority/P2
Status: Backlog

Next: /roadmap-update #<number> --bucket next  (promote to Next)
      /sprint-planning --include #<number>     (pull into current sprint)
```

This is the exemplar. Every other PM command follows the same shape: interview → generate markdown that conforms to the schema → GraphQL mutation → confirm.
```

## `product-management-cli/commands/` — the rest, sketched

Each follows the same pattern. I'll show the signatures; bodies mirror `write-spec.md`:

- **`/roadmap-update #<n> --bucket now|next|later --theme "<t>" --okr "<key>"`**
  Calls `updateRoadmap` mutation. Sets project fields `Roadmap`, `Theme`, `OKR`.

- **`/sprint-planning --start <iso> --end <iso> --goal "<g>" --include <#1,#2,...>`**
  Calls `planSprint`. Creates a new iteration in the project, adds the listed items.

- **`/stakeholder-update --audience exec|engineering|customer --period weekly|monthly`**
  Calls `currentSprint`, `roadmap`, `openPinDrifts`. Generates a markdown update. Does not post anywhere — the user copies into Slack or email. (No Slack MCP dependency.)

- **`/metrics-review --period 30d`**
  Calls `sprintHistory`. Computes velocity, carryover rate, pin-drift SLA (how fast drift Issues close). Emits a scorecard.

- **`/competitive-brief <competitor>`**
  Unchanged from the Cowork version — web search only. Competitive analysis doesn't belong in GitHub Projects.

- **`/brainstorm <topic>`**
  Also unchanged. Brainstorming is conversational, not persisted.

---

# 4. Wiring `platform-engineering` → GitHub

The pin-freshness machinery from earlier now writes to GitHub via the schema instead of the previous ad-hoc `github-script` action. Cleaner because both interactive `/ant-version-check --fix` and scheduled `pin-freshness.yml` use the same mutation.

## Updated `.github/workflows/pin-freshness.yml`

```yaml
name: pin-freshness
on:
  schedule: [{ cron: "0 14 * * 1" }]
  workflow_dispatch: {}
permissions:
  contents: read
  issues:   write
jobs:
  check-pins:
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN:    ${{ secrets.GITHUB_TOKEN }}
      KWPC_REPO_OWNER: ${{ github.repository_owner }}
      KWPC_REPO_NAME:  ${{ github.event.repository.name }}
      KWPC_PROJECT_NUMBER: ${{ vars.KWPC_PROJECT_NUMBER }}
    steps:
      - uses: actions/checkout@v4
      - name: Check all pins and report via schema
        run: |
          source packages/schema/lib/graphql-client.sh

          for pin in it-admin/ant-pin.json platform-engineering/cc-pin.json data-cli/deps-pin.json; do
            drift_json=$(scripts/check-pin-freshness.sh "$pin")
            status=$(echo "$drift_json" | jq -r .status)
            [[ "$status" == "fresh" ]] && continue

            # One mutation — the resolver handles dedup-by-(dependency, plugin) on the GitHub side
            kwpc_graphql reportPinDrift "$(echo "$drift_json" | jq \
              --arg pin "$pin" \
              '{ dependency: .dependency, plugin: .plugin,
                 pinnedVersion: .pinned, installedVersion: .installed, latestVersion: .latest,
                 driftType: .status | ascii_upcase, severity: .severity | ascii_upcase,
                 relevantEntries: .relevant_entries }')"
          done
```

Dedup moved from the JavaScript `github-script` action into the `reportPinDrift` mutation resolver — it's a server-side upsert keyed by `(dependency, plugin)`. Issue title and body get updated if the drift issue already exists; a new issue gets created if not. One less moving part.

## Bonus: the same mutation works from interactive `/ant-version-check`

When a user runs `/ant-version-check` and finds drift, the command can optionally post an Issue for team visibility:

```bash
# inside /ant-version-check
if [[ "$drift_detected" && "$POST_TO_PROJECT" == "true" ]]; then
  source "${CLAUDE_PLUGIN_ROOT}/../packages/schema/lib/graphql-client.sh"
  kwpc_graphql reportPinDrift "$drift_input_json"
fi
```

This turns the interactive and CI paths into the same write. Individuals notice drift locally, teams notice drift on Monday — same data, same Issue.

---

# 5. The end-to-end dogfooding loop

Putting it all together, here's what a week looks like once the suite is running:

```
Monday 14:00 UTC
  └─ pin-freshness.yml runs
     └─ scripts/check-pin-freshness.sh detects ant 1.3.0 > pinned 1.2.1
        └─ reportPinDrift mutation opens Issue #142
           • title: [pin-drift] ant pin in it-admin is drifted
           • labels: pin-drift, area/it-admin, severity/medium, type/drift
           • project fields: Status=BACKLOG, Priority=P1, Roadmap=NEXT

Monday 14:05
  └─ PM runs: /my-tasks --status backlog
     └─ Sees Issue #142 in their queue
     └─ Runs: /stakeholder-update --audience engineering
        └─ Generates a markdown update that includes #142 under "New drift detected this week"

Tuesday
  └─ Engineer runs: /ant-version-check --fix
     └─ Reviews CHANGELOG bullets, bumps ant-pin.json to 1.3.0
     └─ Commits: deps(it-admin): bump ant pin to 1.3.0
        └─ commit body: Closes #142

Tuesday evening
  └─ release-please opens release PR bumping it-admin 0.1.0 → 0.1.1
     └─ CHANGELOG under ### Dependencies: "bump ant pin to 1.3.0"

Wednesday
  └─ Release PR merges
     └─ release-please tags v0.1.1
        └─ publish.yml pushes @anthropic-ai/it-admin@0.1.1 to npm
           └─ Issue #142 auto-closes (linked by "Closes #142" in the merged commit)

Next Monday 14:00 UTC
  └─ pin-freshness.yml runs again
     └─ scripts/check-pin-freshness.sh: ant pinned 1.3.0 = latest 1.3.0 → fresh
        └─ No new Issue. Closed #142 stays closed.
```

This is the loop. The plugins open Issues about themselves; the PM plugins surface those Issues in stakeholder updates; engineers close them; release-please ships the fix; next week's check confirms it.

Every step uses the same canonical schema. No local `TASKS.md` to fall out of sync, no `dashboard.html` to maintain, no third-party tracker — GitHub is already the dashboard.

---

# 6. Updated repo layout

```
knowledge-work-plugins-cli/
├── .github/
│   ├── workflows/
│   │   ├── release-please.yml
│   │   ├── pin-freshness.yml
│   │   ├── test.yml
│   │   └── lint-pr.yml
│   └── ISSUE_TEMPLATE/
│       ├── pin-update.yml
│       ├── spec.yml          # Uses canonical schema structure
│       └── bug.yml
├── packages/
│   └── schema/                          # @anthropic-ai/kwpc-schema
│       ├── graphql/
│       │   ├── canonical.graphql        # The schema
│       │   └── queries/                 # One .graphql file per operation
│       │       ├── myTasks.graphql
│       │       ├── createTaskInProject.graphql
│       │       ├── createSpec.graphql
│       │       ├── currentSprint.graphql
│       │       ├── planSprint.graphql
│       │       ├── reportPinDrift.graphql
│       │       ├── updateRoadmap.graphql
│       │       └── getProjectId.graphql
│       ├── lib/
│       │   └── graphql-client.sh
│       ├── CHANGELOG.md
│       └── package.json
├── data-cli/
├── productivity-cli/                    # NEW
├── product-management-cli/              # NEW
├── platform-engineering/
├── it-admin/
├── scripts/
│   ├── check-pin-freshness.sh           # Now posts via kwpc_graphql reportPinDrift
│   └── lib/
│       └── parse-changelog.sh
├── release-please-config.json           # 6 packages now (5 plugins + schema)
├── .release-please-manifest.json
└── README.md
```

## Updated `release-please-config.json`

```diff
  "packages": {
+   "packages/schema": {
+     "package-name": "@anthropic-ai/kwpc-schema",
+     "changelog-path": "CHANGELOG.md",
+     "release-type": "node"
+   },
    "data-cli":              { ... },
+   "productivity-cli":      { "package-name": "@anthropic-ai/productivity-cli", ... },
+   "product-management-cli":{ "package-name": "@anthropic-ai/product-management-cli", ... },
    "platform-engineering":  { ... },
    "it-admin":              { ... }
  },
  "plugins": [
-   { "type": "linked-versions", "components": ["data-cli", "platform-engineering", "it-admin"] }
+   { "type": "linked-versions", "components": ["data-cli", "productivity-cli", "product-management-cli", "platform-engineering", "it-admin"] }
  ]
```

Schema package is *not* in the linked set — it versions independently because consumers (the plugins) pin against it explicitly. If the schema bumps minor, only plugins that use the new field need to bump.

---

# Updated todo

- [x] 1. Define the canonical schema — Task, Spec, Roadmap item, Sprint, PinDrift as GraphQL types mapping to GitHub Projects fields
- [x] 2. Build `knowledge-work-plugins-schema` as a standalone package two plugins depend on
- [x] 3. Port `productivity-cli` — `/my-tasks`, `/task-add`, memory skills, no dashboard/TASKS.md
- [x] 4. Port `product-management-cli` — `/write-spec` as exemplar, rest sketched; all backed by GraphQL mutations
- [x] 5. Wire `pin-drift` from `platform-engineering` to `reportPinDrift` mutation (dedup server-side)
- [x] 6. Show the end-to-end dogfooding loop — Monday drift → Tuesday fix → Wednesday release → next Monday closed
- [x] 7. Update the monorepo structure with all five plugins + schema package
- [ ] 8. (Optional next) Flesh out the remaining 7 query files in `packages/schema/graphql/queries/`
- [ ] 9. (Optional next) Write the `reportPinDrift` resolver's dedup logic in detail

The plugins we just designed (`data-cli`, `platform-engineering`, `it-admin`) are the *product*. The two Cowork plugins we have in hand (`productivity`, `product-management`) are how the team *coordinates building the product*.

This isn't just a cute framing. It's a real test of whether our PM tooling works on a project it wasn't obviously designed for — not a SaaS product with customers and a funnel, but a plugin suite with developers, pins, and CHANGELOGs.

## The coordination model

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PROJECT COORDINATION                         │
│                     (Cowork knowledge-work-plugins)                  │
│                                                                      │
│  ┌──────────────────────────┐    ┌─────────────────────────────┐     │
│  │    product-management    │    │        productivity         │     │
│  │                          │    │                             │     │
│  │  /write-spec             │    │  /start (memory + tasks)    │     │
│  │  /roadmap-update         │    │  /update --comprehensive    │     │
│  │  /stakeholder-update     │    │  CLAUDE.md (hot cache)      │     │
│  │  /synthesize-research    │    │  memory/ (decoder ring)     │     │
│  │  /competitive-brief      │    │  TASKS.md (shared todo)     │     │
│  │  /metrics-review         │    │  dashboard.html (UI)        │     │
│  │  /brainstorm             │    │                             │     │
│  │  /sprint-planning        │    │                             │     │
│  └──────────────────────────┘    └─────────────────────────────┘     │
│                   │                          │                       │
│                   └──────────┬───────────────┘                       │
│                              ▼                                       │
└──────────────────────────────────────────────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
┌───────────────────┐ ┌─────────────────┐ ┌─────────────┐
│     data-cli      │ │ platform-eng.   │ │  it-admin   │
│                   │ │                 │ │             │
│  THE PRODUCT we're building — Claude Code plugin suite │
└───────────────────┘ └─────────────────┘ └─────────────┘
```

## 1. Seed `productivity` memory with this project

The first move is populating the memory system so the coordination layer understands our actual work. Without this, every prompt about "the migration" or "the pin stuff" costs a round trip.

### `CLAUDE.md` (working memory)

```markdown
# Memory

## Me
[Name], platform engineer owning the knowledge-work-plugins-cli repo. Shipping three CLI plugins that mirror the Cowork suite: data-cli, platform-engineering, it-admin.

## People
| Who | Role |
|-----|------|
| **Bruce** | Bruce (last-Thu commits on anthropic-cli); upstream contact for ant CLI questions |
| **Ale** | AlePouroullis (anthropic-cli maintainer); upstream contact for ant releases |
| **DX team** | Developer Experience — owns Claude Code CHANGELOG and doc surface |
| **Finance** | Owns org Admin API key rotation for it-admin testing |
→ Full list: memory/glossary.md, profiles: memory/people/

## Terms
| Term | Meaning |
|------|---------|
| ant | The Claude Platform CLI (`github.com/anthropics/anthropic-cli`), invoked as `ant` |
| the pin | A `*-pin.json` file recording the upstream version a plugin's skills were authored against |
| drift | Installed upstream version > pinned version; can be patch/minor/major |
| stack-check | `/stack-check` command in platform-engineering that reports all pins at once |
| surface | The plugin-authoring interface in Claude Code: frontmatter fields, hook events, plugin.json keys |
| release-please | Google's tool that opens version-bump PRs from Conventional Commits |
| watch_for | Per-pin array of strings used to filter CHANGELOG bullets for relevance |
→ Full glossary: memory/glossary.md

## Projects
| Name | What |
|------|------|
| **kwpc** | knowledge-work-plugins-cli — the three-plugin monorepo |
| **data-cli** | Terminal data analyst; DuckDB-first |
| **platform-engineering** | `/skill-creator`, `/plugin-customizer`, authoring surface tracking |
| **it-admin** | `ant admin *` wrapper for org admins |
| **pin-freshness** | Weekly GitHub Action that diffs each plugin's pin against upstream |
→ Details: memory/projects/

## Preferences
- Conventional Commits, scoped: `feat(data-cli):`, `deps(it-admin):`
- Monday 14:00 UTC for pin-freshness cron; never Friday
- One release PR for all three plugins (linked-versions); unlink later if needed
- Pure bash + jq in CI, no Python
- Claude Code docs at code.claude.com/docs/en preferred over GitHub CHANGELOG.md
- NPM scope: `@anthropic-ai/*`; never publish to unscoped or personal
```

### `memory/glossary.md` (decoder ring excerpt)

```markdown
# Glossary

## Acronyms
| Term | Meaning | Context |
|------|---------|---------|
| kwpc | knowledge-work-plugins-cli | This repo |
| kwp | knowledge-work-plugins | Cowork sibling repo |
| CC | Claude Code | The CLI we're building plugins for |
| ZDR | Zero Data Retention | Admin API feature surfaced in it-admin |
| OCF | Open Container Format | Unrelated; don't confuse with our plugins |
| CLI | Command Line Interface | Both `claude` and `ant` |

## Project Codenames
| Codename | Project |
|----------|---------|
| kwpc | The three CLI plugins (data-cli, platform-engineering, it-admin) |
| pin-freshness | The weekly drift-check automation |
| stack-check | The unified pin status command |

## Internal Terms
| Term | Meaning |
|------|---------|
| the pin | A *-pin.json file |
| the drift | Upstream version > pinned version |
| the surface | Plugin authoring API in Claude Code |
| the bump | Updating a pin to match a newer upstream version |
| the suite | All three CLI plugins, versioned together |
| the sibling | The Cowork knowledge-work-plugins repo |
```

### `memory/projects/kwpc.md`

```markdown
# knowledge-work-plugins-cli (kwpc)

**Status:** Active, pre-0.1.0
**Target:** First release 0.1.0 on npm under `@anthropic-ai/`

## What It Is
A three-plugin monorepo mirroring the Cowork `knowledge-work-plugins` but tuned for the Claude Code CLI:
- `data-cli` — terminal data analyst
- `platform-engineering` — plugin authoring toolkit (`/skill-creator`, `/plugin-customizer`)
- `it-admin` — `ant admin *` wrapper

## Key Decisions Made
- **Release tool:** release-please (matches anthropic-cli and claude-code)
- **Versioning:** Linked across all three plugins initially; unlink later if cadences diverge
- **Distribution:** npm under `@anthropic-ai/*` scope
- **CI:** GitHub Actions, pure bash + jq, no Python
- **Pin shape:** Three distinct pin files — flat (ant-pin.json), nested-by-package (cc-pin.json with authoring_surface), nested-by-dependency (deps-pin.json with per-dep entries)
- **Pin-freshness cadence:** Weekly Monday 14:00 UTC
- **Changelog filtering:** Same filter logic in CI (scripts/lib/parse-changelog.sh) and interactive skills (ant-version-management, cc-surface-management)

## Open Questions
- Should `/stack-check` ship in platform-engineering, or be its own micro-plugin?
- When to unlink versions (if ever)
- Should we pin the `claude` CLI itself in every plugin, or only in platform-engineering?
- Whether to also ship plugins on the Anthropic plugin directory (clau.de/plugin-directory-submission)

## Dependencies
- `ant` v1.2.1+ (it-admin)
- Claude Code (via `claude` CLI) — latest (all three)
- DuckDB 1.1.3+ (data-cli)
- Node 20 (for release-please + npm publish in CI)

## Links
- GitHub: anthropics/knowledge-work-plugins-cli (pending creation)
- Sibling: github.com/anthropics/knowledge-work-plugins (Cowork plugins)
- Upstream ant: github.com/anthropics/anthropic-cli
- Upstream Claude Code: github.com/anthropics/claude-code
```

## 2. Seed `TASKS.md` with the actual build plan

This is where coordination gets real. The roadmap we designed becomes executable work items the `productivity` dashboard can render.

```markdown
# Tasks

## Now (this week)

- [ ] **Create anthropics/knowledge-work-plugins-cli repo** - init with LICENSE (Apache-2.0), README, CODE_OF_CONDUCT
- [ ] **Scaffold release-please config** - release-please-config.json + .release-please-manifest.json with linked versions
  - [ ] Verify `extra-files` updates .claude-plugin/plugin.json on each package
  - [ ] Verify `changelog-sections` hides chore/ci/style/refactor/test/build
  - [ ] Add `deps` as a non-hidden section
- [ ] **Set up .github/workflows/release-please.yml** - open release PRs, publish on merge
  - [ ] Create NPM_TOKEN secret (org-scoped, publish-only)
  - [ ] Verify per-package publish gating (`<package>--release_created` output)
- [ ] **Add three plugin skeletons** - .claude-plugin/plugin.json + README + LICENSE for each of data-cli, platform-engineering, it-admin

## Next (this sprint)

- [ ] **Implement scripts/lib/parse-changelog.sh** - CHANGELOG parsing shared by CI and interactive skills
  - [ ] Handle release-please format (## X.Y.Z, ### Features/Bug Fixes/etc.)
  - [ ] Version range filter (from, to]
  - [ ] watch_for alternation grep
  - [ ] JSON array output via jq
- [ ] **Implement scripts/check-pin-freshness.sh** - three pin shapes, three exit codes
  - [ ] Flat pin (ant-pin.json)
  - [ ] Nested-by-package (cc-pin.json)
  - [ ] Nested-by-dependency (deps-pin.json with per-dep loop)
- [ ] **Wire .github/workflows/pin-freshness.yml** - weekly cron, issue dedup by title
  - [ ] Set labels: pin-drift, area/<plugin>, severity/<level>
  - [ ] Update-in-place on subsequent runs (not re-open)
- [ ] **Smoke-test parse-changelog.sh against real CHANGELOGs**
  - [ ] anthropics/anthropic-cli/CHANGELOG.md
  - [ ] anthropics/claude-code/CHANGELOG.md
  - [ ] Verify filter drops internal chores, keeps Features/BREAKING
- [ ] **Write /stack-check in platform-engineering** - aggregates all three pin checks
  - [ ] Text mode + --json mode
  - [ ] --fix passes through only to auto-safe per-plugin fixes
- [ ] **Author ant-cli-basics skill** - covers --format, --transform (GJSON), auth

## Later (next sprint+)

- [ ] **Prototype /plugin-customizer against a sibling plugin** - validate the `~~` placeholder workflow in CLI context
- [ ] **Add commitlint + husky** for pre-commit Conventional Commits enforcement
- [ ] **Add .github/workflows/lint-pr.yml** - amannn/action-semantic-pull-request on PR titles
- [ ] **First release cut** - 0.1.0 of all three plugins, published to @anthropic-ai/* on npm
- [ ] **Add claude-plugins-official submission** - register in Anthropic's plugin directory
- [ ] **Write docs for code.claude.com** - plugin suite overview, per-plugin landing page
- [ ] **Add Cloudflare AI Gateway docs** - how to route plugin-generated API calls through the gateway
- [ ] **/surface drift audit** - first real run of /cc-version-check --surface against # Claude Code Plugin Suite

Three plugins mirroring the Cowork `data` + `cowork-plugin-management` pattern, shifted for the Claude Code CLI. Plus a new `it-admin` plugin wrapping the Anthropic Admin API.

```
knowledge-work-plugins-cli/
├── data-cli/                  # Terminal data analyst (DuckDB/SQLite/warehouse-via-MCP)
├── platform-engineering/      # Plugin/skill authoring toolkit (CLI equivalent of cowork-plugin-management)
└── it-admin/                  # Anthropic Admin API wrapper (orgs, workspaces, usage, keys, analytics)
```

Install any of them with:

```bash
claude plugins add knowledge-work-plugins-cli/data-cli
claude plugins add knowledge-work-plugins-cli/platform-engineering
claude plugins add knowledge-work-plugins-cli/it-admin
```

---

# 1. `data-cli`

## `data-cli/.claude-plugin/plugin.json`

```json
{
  "name": "data-cli",
  "version": "0.1.0",
  "description": "Terminal-native data analyst: SQL over DuckDB/SQLite/warehouses, exploration, viz, and validation. Tuned for Claude Code (including claude.ai/web sessions with pre-installed Postgres/Redis and Docker).",
  "author": { "name": "Anthropic" },
  "keywords": ["data", "sql", "duckdb", "sqlite", "analytics"]
}
```

## `data-cli/.mcp.json`

```json
{
  "mcpServers": {
    "snowflake": { "type": "http", "url": "" },
    "databricks": { "type": "http", "url": "" },
    "bigquery":   { "type": "http", "url": "https://bigquery.googleapis.com/mcp" },
    "definite":   { "type": "http", "url": "https://api.definite.app/v3/mcp/http" }
  },
  "recommendedCategories": ["data-warehouse", "notebook", "product-analytics", "project-tracker"]
}
```

## `data-cli/CONNECTORS.md`

```markdown
# Connectors

Plugin files use `~~category` as a placeholder for whatever tool the user connects.

| Category          | Placeholder           | Included servers          | Other options                  |
|-------------------|-----------------------|---------------------------|--------------------------------|
| Data warehouse    | `~~data warehouse`    | BigQuery, Definite        | Snowflake, Databricks, Postgres |
| Local analytics   | `~~local analytics`   | DuckDB, SQLite (built-in) | —                              |
| Product analytics | `~~product analytics` | Amplitude                 | Mixpanel, Heap                 |
| Project tracker   | `~~project tracker`   | Atlassian                 | Linear, Asana                  |

## Terminal-first defaults

Unlike the Cowork `data` plugin, `data-cli` defaults to **local analytics** (DuckDB over CSV/Parquet, SQLite files) and falls back to MCP-connected warehouses when the user requests them. Charts render as ASCII/Unicode via `termgraph` or PNG via matplotlib (saved to disk and opened with `$PAGER`-style hooks). No HTML dashboards — that's a Cowork affordance.
```

## `data-cli/README.md`

```markdown
# data-cli

Claude Code's data analyst. Works on your laptop, in `claude` SSH sessions, and in **Claude Code on the web** (where Postgres and Redis are pre-installed but need `service postgresql start`, and Docker is available for containerized services).

## Commands (slash commands)

| Command           | Description                                                                  |
|-------------------|------------------------------------------------------------------------------|
| `/analyze`        | Answer a data question end-to-end                                            |
| `/explore-data`   | Profile a table, CSV, or Parquet file                                        |
| `/write-query`    | Write optimized SQL for your dialect (DuckDB, SQLite, Postgres, warehouses)  |
| `/create-viz`     | ASCII/Unicode chart in the terminal, or a PNG if requested                   |
| `/validate`       | QA an analysis before sharing                                                |
| `/load-csv`       | Load one or more CSV/Parquet files into a local DuckDB database              |
| `/start-services` | Start pre-installed Postgres/Redis in web sessions                           |
| `/deps-check`     | Verify DuckDB, SQLite, psql, Python deps against pinned versions             |

## Skills (auto-triggered)

| Skill                          | Purpose                                                           |
|--------------------------------|-------------------------------------------------------------------|
| `sql-queries`                  | Dialect-specific SQL patterns (DuckDB-first, plus Postgres/BQ/Snowflake/Databricks) |
| `duckdb-analytics`             | DuckDB-native patterns: reading CSV/Parquet, extensions, attach   |
| `data-exploration`             | Profiling and quality assessment                                  |
| `data-visualization-terminal`  | termgraph, plotext, and matplotlib-to-PNG patterns                |
| `statistical-analysis`         | Descriptive stats, trends, outliers                               |
| `data-validation`              | Pre-share QA                                                      |
| `deps-version-management`      | Keep DuckDB/SQLite/Python deps aligned with pinned versions       |

## Subagents (`agents/`)

- `query-optimizer` — reviews a SQL query and rewrites it for the target dialect
- `data-profiler` — runs a full profile on a dataset and returns a structured report
- `viz-picker` — given a DataFrame, recommends a chart type and emits code

## Resource limits (web sessions)

Cloud sessions run with ~4 vCPU / 16GB RAM / 30GB disk. For bigger workloads, use Remote Control on your own hardware. Large DuckDB joins or wide Pandas operations may OOM — prefer streaming/`read_csv_auto` with projection pushdown.

## Typical workflow on the web

```
$ service postgresql start
$ claude
> /deps-check
> /load-csv ./data/orders.csv ./data/users.csv
> /explore-data orders
> /analyze What's the weekly revenue trend, split by channel, for the last 90 days?
> /create-viz line chart of weekly revenue, one line per channel
```
```

## `data-cli/deps-pin.json`

```json
{
  "dependencies": {
    "duckdb": {
      "pinned_version": "1.1.3",
      "minimum_version": "1.0.0",
      "changelog_url": "https://raw.githubusercontent.com/duckdb/duckdb/main/CHANGELOG.md",
      "repo_url": "https://github.com/duckdb/duckdb",
      "check_command": "duckdb --version",
      "watch_for": ["read_csv", "read_parquet", "ATTACH", "httpfs", "postgres", "sqlite", "SUMMARIZE", "COPY", "breaking", "deprecat"],
      "required": true
    },
    "sqlite3": {
      "pinned_version": "3.45.0",
      "minimum_version": "3.35.0",
      "check_command": "sqlite3 --version",
      "required": false,
      "notes": "Needed only if the user works with .sqlite files directly. DuckDB can ATTACH SQLite without the CLI."
    },
    "psql": {
      "pinned_version": "16",
      "minimum_version": "14",
      "check_command": "psql --version",
      "required": false,
      "notes": "Only needed if the user wants to run queries against Postgres outside DuckDB's ATTACH."
    }
  },
  "python_packages": {
    "pinned": {
      "duckdb": "1.1.3",
      "pandas": "2.2.0",
      "plotext": "5.3.2",
      "matplotlib": "3.9.0"
    },
    "minimum": {
      "duckdb": "1.0.0",
      "pandas": "2.0.0",
      "plotext": "5.0.0",
      "matplotlib": "3.7.0"
    }
  }
}
```

## `data-cli/commands/deps-check.md`

```markdown
---
description: Verify DuckDB, SQLite, psql, and Python dependencies against the plugin's pinned versions
allowed-tools: Bash(duckdb:*), Bash(sqlite3:*), Bash(psql:*), Bash(python:*), Bash(pip:*), Bash(curl:*), Read
argument-hint: "[--fix] [--verbose]"
---

Args: `$ARGUMENTS`

## Step 1: Read the pin

Read `${CLAUDE_PLUGIN_ROOT}/deps-pin.json`. For each dependency in `dependencies`, run its `check_command` and parse the version.

## Step 2: Classify each dependency

For each one:
- **Missing** and `required: true` → error, print install instructions
- **Missing** and `required: false` → note but don't fail
- **Below minimum** → warn (error if required)
- **Between minimum and pinned** → note the delta; the plugin should work but some skills' examples may reference newer features
- **At pinned** → ✓
- **Above pinned** → offer to diff the CHANGELOG

## Step 3: Python packages

If any skill uses Python (most viz skills do), verify `pip show <pkg>` against `python_packages.minimum`. Report missing or too-old packages with:

```
Missing or outdated Python packages:
  - duckdb (not installed, need >=1.0.0)
  - plotext (installed 4.2.0, need >=5.0.0)

Install with:
  pip install 'duckdb>=1.0.0' 'plotext>=5.0.0'
```

## Step 4: DuckDB CHANGELOG diff (when installed > pinned)

DuckDB's CHANGELOG isn't structured quite like release-please — it uses GitHub releases. Prefer the release notes at `https://github.com/duckdb/duckdb/releases` over a flat CHANGELOG.md. Use `curl` with the GitHub API if available:

```bash
curl -sL "https://api.github.com/repos/duckdb/duckdb/releases" | jq -r '.[] | select(.tag_name > "v<pinned>") | "## \(.tag_name)\n\(.body)"'
```

Apply the same filtering heuristics as `it-admin/ant-version-management`:
- Keep: new functions, `read_csv`/`read_parquet` changes, `ATTACH` changes, extension updates, breaking changes
- Drop: internal test fixes, CI-only changes, docs-only changes

## Step 5: Report

One pass-through line if everything matches. Otherwise a structured report like in `/ant-version-check`, grouped by dependency.

## Step 6: --fix

Only auto-install Python packages with `pip install --user`. Never auto-install system binaries like `duckdb` — print the install command (`brew install duckdb`, `sudo apt install duckdb`, or download from duckdb.org) and let the user run it.

Never auto-bump pins without explicit confirmation.
```

## `data-cli/skills/deps-version-management/SKILL.md`

```markdown
---
name: deps-version-management
description: >
  Keep DuckDB, SQLite, psql, and Python packages aligned with the plugin's pinned
  versions. Use when a user reports a data command failing, when duckdb syntax
  looks wrong, or when the user asks about upgrading data tooling.
---

## When to invoke

- Before `/load-csv`, `/analyze`, or `/explore-data` on a new machine
- When a DuckDB query returns `Catalog Error: Function <name> does not exist` or `Binder Error: Unknown extension`
- When the user asks "what DuckDB version do I have" or "is my Python setup right for this"

## The pin

`data-cli/deps-pin.json` records versions for every external binary and Python package the plugin assumes. DuckDB is the core dependency — everything else is optional.

## Version comparison

DuckDB follows semver loosely. Use `sort -V`:

```bash
installed="$(duckdb --version | awk '{print $1}' | sed 's/^v//')"
pinned="$(jq -r .dependencies.duckdb.pinned_version ${CLAUDE_PLUGIN_ROOT}/deps-pin.json)"
printf '%s\n%s\n' "$installed" "$pinned" | sort -V | head -1
```

## Why these specific dependencies are pinned

- **DuckDB** — the core engine. Version drift matters: `read_csv_auto` options change, extensions update their APIs, `ATTACH` syntax evolves. The `sql-queries` and `duckdb-analytics` skills assume the pinned version's surface.
- **SQLite** — only needed when working with `.sqlite` files outside DuckDB. Most users can skip this.
- **psql** — only needed when running queries against Postgres *outside* DuckDB's `ATTACH`. Most workflows route through DuckDB.
- **Python packages** — `plotext` for terminal charts, `matplotlib` for PNG output, `pandas` for DataFrame manipulation.

## Fetching DuckDB's release notes

DuckDB uses GitHub releases, not a flat CHANGELOG.md. Their release notes are long and detailed — filter aggressively:

```bash
curl -sL "https://api.github.com/repos/duckdb/duckdb/releases" \
  | jq -r '.[0:5] | .[] | "\(.tag_name)\n\(.published_at)\n\(.body)\n---"'
```

Filter rules (stricter than for `ant` because DuckDB releases are huge):
- Keep bullets mentioning: `read_csv`, `read_parquet`, `ATTACH`, extension names the plugin uses (httpfs, postgres_scanner, sqlite_scanner), `COPY`, `SUMMARIZE`, window functions
- Keep all bullets under "Breaking Changes" or "⚠️"
- Drop bullets about: the DuckDB UI, specific bindings (R, Java, Node) unless they're Python, storage format internals unless breaking, testing/CI

## When a DuckDB upgrade changes behavior

The most common surprises:
- CSV auto-detection has become more strict in recent versions — queries that worked with `read_csv_auto` may need explicit column specs
- Extension autoload behavior changed between 0.x and 1.x
- The storage format is not backward-compatible across major versions

If a query fails after a DuckDB upgrade, read the release notes for the intervening versions before rewriting the query.

## Docs

- DuckDB: https://github.com/duckdb/duckdb
- DuckDB docs: https://duckdb.org/docs/
- plotext: https://github.com/piccolomo/plotext
```

## `data-cli/commands/analyze.md`

```markdown
---
description: Answer a data question end-to-end (query + analyze + visualize + validate)
allowed-tools: Read, Write, Bash(duckdb:*), Bash(sqlite3:*), Bash(psql:*), Bash(python:*), Grep, Glob
argument-hint: "<natural language question>"
---

Parse the user's question: `$ARGUMENTS`

Determine complexity:
- **Quick**: single metric, one filter → one query, format as terminal table
- **Full**: multi-dimensional or trend → multiple queries + ASCII chart + narrative
- **Report**: methodology + caveats + recommendations → save a markdown file

Data-source resolution order:
1. User pointed at a file or DB path → use that directly (DuckDB `read_csv_auto` / `ATTACH`)
2. User has a warehouse MCP connected → query it
3. User mentioned Postgres/Redis in a web session → run `service postgresql start` first if needed
4. Otherwise → ask for a file path or describe the schema

Use the `sql-queries` and `duckdb-analytics` skills for dialect-specific syntax. Use `data-validation` to sanity-check before presenting. Use `data-visualization-terminal` if a chart would help.

Output format:
- Lead with the finding in one sentence
- Terminal table (via `column -t` or rich) with the key numbers
- Optional ASCII chart
- Collapsed SQL (show full query only if asked)
```

## `data-cli/commands/load-csv.md`

```markdown
---
description: Load one or more CSV/Parquet files into a local DuckDB database
allowed-tools: Read, Write, Bash(duckdb:*), Bash(ls:*), Glob
argument-hint: "<file1> [file2] ... [--db path.duckdb]"
---

Files to load: `$ARGUMENTS`

For each file:
1. Verify it exists and is readable
2. Infer table name from filename (strip extension, kebab→snake)
3. Create/attach the DuckDB database (default: `./data.duckdb`)
4. Run `CREATE OR REPLACE TABLE <name> AS SELECT * FROM read_csv_auto('<path>', SAMPLE_SIZE=-1)` for CSVs, or `read_parquet` for Parquet
5. Report row count, column count, and a 5-row preview per table

After loading, print the connection string the user can use in follow-up queries:
```
duckdb ./data.duckdb
```
```

## `data-cli/commands/start-services.md`

```markdown
---
description: Start pre-installed services (Postgres, Redis) in Claude Code web sessions
allowed-tools: Bash(service:*), Bash(pg_isready:*), Bash(redis-cli:*)
---

Claude Code on the web ships with Postgres and Redis pre-installed but not running. Start whichever the user needs.

For Postgres:
1. `service postgresql start`
2. `pg_isready` to confirm
3. Print the default connection string

For Redis:
1. `service redis-server start`
2. `redis-cli ping` → expect `PONG`

If Docker-based services are needed instead, suggest `docker compose up` and mention that pulled images are cached across sessions but containers must be restarted each session.
```

## `data-cli/skills/duckdb-analytics/SKILL.md`

```markdown
---
name: duckdb-analytics
description: >
  Use DuckDB for fast local analytics on CSV, Parquet, JSON, and attached databases.
  Triggers: "query a CSV", "analyze a Parquet file", "local SQL", "DuckDB", "attach a Postgres database".
---

DuckDB is the default engine for `data-cli` when no warehouse is connected. It reads CSV/Parquet/JSON directly without a load step and supports attaching to Postgres, SQLite, and MySQL.

## Read files directly

```sql
-- CSV with type inference (SAMPLE_SIZE=-1 scans whole file for accurate types)
SELECT * FROM read_csv_auto('orders.csv', SAMPLE_SIZE=-1) LIMIT 10;

-- Parquet (projection + predicate pushdown are automatic)
SELECT user_id, SUM(amount) FROM 'events/*.parquet'
WHERE event_date >= '2024-01-01' GROUP BY 1;

-- JSON Lines
SELECT * FROM read_json_auto('logs.jsonl');

-- Multiple files in one query (glob)
SELECT * FROM read_parquet('data/year=*/month=*/*.parquet');
```

## Attach external databases

```sql
-- Query a local Postgres instance directly
ATTACH 'dbname=mydb user=postgres host=localhost' AS pg (TYPE POSTGRES, READ_ONLY);
SELECT COUNT(*) FROM pg.public.users;

-- SQLite file
ATTACH 'app.sqlite' AS app (TYPE SQLITE);

-- Another DuckDB file
ATTACH 'warehouse.duckdb' AS wh;
```

## Performance tips (for 16GB web sessions)

- Filter early: push `WHERE` clauses into the `read_*` function when possible
- Select only needed columns — Parquet projection saves massive memory
- For huge CSVs, pre-convert to Parquet: `COPY (SELECT * FROM read_csv_auto('big.csv')) TO 'big.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);`
- Use `SET memory_limit='12GB';` to leave headroom for the Claude process
- Use `SUMMARIZE <table>` for a fast profile instead of hand-rolled aggregations

## Common gotchas

- Dates in CSV: if type inference picks VARCHAR, cast explicitly with `TRY_STRPTIME`
- `read_csv_auto` with mixed types in a column: set `SAMPLE_SIZE=-1` or declare columns explicitly
- `ATTACH ... TYPE POSTGRES` requires the `postgres` extension: `INSTALL postgres; LOAD postgres;`
```

## `data-cli/skills/data-visualization-terminal/SKILL.md`

```markdown
---
name: data-visualization-terminal
description: >
  Render charts in the terminal with termgraph or plotext, or save PNGs with matplotlib.
  Triggers: "plot", "chart", "visualize", "graph in terminal", "ASCII chart".
---

Terminal-first visualization. No HTML — those belong in the Cowork `data` plugin.

## Decision order

1. **ASCII/Unicode in stdout** via `plotext` — default. Lines, bars, scatter, histograms all work.
2. **PNG saved to disk** via matplotlib — when the user wants to share a chart or embed in a report.
3. **Recommend `/build-dashboard` in Cowork** if the user asks for anything interactive.

## plotext quick reference

```python
import plotext as plt
plt.plot(dates, revenue)
plt.title("Weekly Revenue")
plt.xlabel("Week")
plt.ylabel("USD")
plt.show()  # prints to stdout
```

Use `plt.bar()`, `plt.hist()`, `plt.scatter()` for other chart types. For grouped bars or multi-line charts, call the plotting function multiple times before `plt.show()`.

## matplotlib-to-PNG pattern

```python
import matplotlib
matplotlib.use("Agg")  # headless — critical in web sessions
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(10, 6), dpi=150)
# ... chart code ...
fig.tight_layout()
fig.savefig("chart.png", bbox_inches="tight")
print("Saved chart.png")
```

Always set `matplotlib.use("Agg")` before importing pyplot in CLI contexts — otherwise it tries to open a display and hangs in web sessions.

## Chart selection

Reuse the same decision table as the Cowork `data-visualization` skill (trends → line, comparisons → bar, distribution → histogram, correlation → scatter). Avoid pie charts; avoid dual-axis.
```

## `data-cli/agents/query-optimizer.md`

```markdown
---
name: query-optimizer
description: Use this agent when the user asks to optimize a slow SQL query, reduce warehouse cost, or translate a query between dialects.

<example>
Context: User has a slow Snowflake query
user: "This query takes 4 minutes, can you speed it up?"
assistant: "I'll use the query-optimizer agent to review it and propose a rewrite."
</example>

model: inherit
color: cyan
tools: ["Read", "Grep", "Bash"]
---

You are a SQL performance specialist. Analyze a query against its dialect's execution model and produce a rewrite.

**Process**:
1. Identify the dialect (ask or infer from `.mcp.json` / context)
2. Read the query and any available schema/metadata
3. Diagnose: sequential scans, missing partition filters, exploding joins, sort spills, correlated subqueries
4. Propose a rewrite with a short rationale per change
5. If possible, run both with `EXPLAIN` and compare estimated cost

**Output**:
- Diagnosis (3–5 bullets, severity-ranked)
- Rewritten query with comments on each change
- Estimated impact (qualitative: "eliminates full scan of fact table", or quantitative if EXPLAIN available)
```

## `data-cli/agents/data-profiler.md`

```markdown
---
name: data-profiler
description: Use proactively when a new dataset is loaded. Produces a structured profile (nulls, cardinality, distributions, quality flags).
model: inherit
color: blue
tools: ["Read", "Bash", "Write"]
---

You are a data profiling specialist. Given a table, CSV, or Parquet file, produce a full profile using DuckDB's `SUMMARIZE` plus targeted follow-up queries.

**Process**:
1. Run `SUMMARIZE <table>` for the quick pass
2. Classify columns: identifier / dimension / metric / temporal / text / boolean
3. For each column, report null rate, distinct count, top 5 values, and type-specific stats
4. Flag quality issues: high nulls, placeholder values (0, -1, 999, "N/A", "test"), suspicious cardinality, future dates in historical data, duplicates on suspected keys
5. Recommend 3–5 follow-up analyses

Return a markdown report. If the user wants to save it, write to `profile_<table>_<date>.md`.
```

## Other `data-cli/skills/` (abbreviated — same shape as Cowork `data`)

- `sql-queries/SKILL.md` — same as Cowork's, with DuckDB added as a first-class dialect
- `data-exploration/SKILL.md` — reuse Cowork content, swap warehouse-queries for DuckDB-first examples
- `statistical-analysis/SKILL.md` — copy from Cowork unchanged
- `data-validation/SKILL.md` — copy from Cowork unchanged

---

# 2. `platform-engineering`

CLI equivalent of `cowork-plugin-management`. Contains `/skill-creator` and `/plugin-customizer`, plus supporting skills for writing good Claude Code plugins.

## `platform-engineering/.claude-plugin/plugin.json`

```json
{
  "name": "platform-engineering",
  "version": "0.1.0",
  "description": "Build, customize, and ship Claude Code plugins. CLI equivalent of cowork-plugin-management. Includes /skill-creator and /plugin-customizer.",
  "author": { "name": "Anthropic" }
}
```

## `platform-engineering/README.md`

```markdown
# platform-engineering

The plugin for platform engineers managing Claude Code at their org. Scaffold skills, customize existing plugins, validate plugin structure, and package `.plugin` bundles.

## Commands

| Command               | Description                                                               |
|-----------------------|---------------------------------------------------------------------------|
| `/skill-creator`      | Create a new skill (SKILL.md + references/ + examples/) with good defaults |
| `/plugin-customizer`  | Fill `~~` placeholders and wire up MCPs in an existing plugin              |
| `/plugin-new`         | Scaffold a new plugin from scratch                                         |
| `/plugin-validate`    | Run `claude plugin validate` and fix any issues                            |
| `/plugin-package`     | Zip to a `.plugin` file for distribution                                   |
| `/cc-version-check`   | Check Claude Code version against the plugin authoring surface pin        |

## Skills

- `plugin-architecture` — Claude Code plugin layout, frontmatter fields, `${CLAUDE_PLUGIN_ROOT}`
- `subagent-authoring` — Subagent frontmatter: description, prompt, tools, disallowedTools, model, permissionMode, mcpServers, hooks, maxTurns, skills, initialPrompt, memory, effort, background, isolation, color
- `skill-writing` — Progressive disclosure, trigger phrases, imperative voice
- `mcp-integration` — `.mcp.json` formats (stdio, sse, http), env var expansion
- `hooks-authoring` — Event types, matchers, prompt vs command hooks
- `cc-surface-management` — Track Claude Code changes that affect plugin authoring

## Subagent scopes (reminder)

Claude Code resolves subagents from, in precedence order:
1. **Managed** (`<managed-settings>/.claude/agents/`) — org admins only
2. **Project** (`.claude/agents/` in repo)
3. **User** (`~/.claude/agents/`) — personal, available across projects
4. **Plugin** (`agents/` inside installed plugins)
5. **CLI ephemeral** (`claude --agents '{...}'`) — session-only

Plugin subagents **cannot** use `hooks`, `mcpServers`, or `permissionMode` — those are stripped at load. If a subagent needs them, it must be copied to `.claude/agents/` or `~/.claude/agents/`.
```

## `platform-engineering/cc-pin.json`

```json
{
  "claude_code": {
    "pinned_version": "2.0.0",
    "minimum_version": "1.9.0",
    "changelog_sources": [
      "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
      "https://code.claude.com/docs/en/changelog"
    ],
    "check_command": "claude --version",
    "notes": "Pinned against the Claude Code version that introduced the full subagent frontmatter surface: initialPrompt, memory, effort, background, isolation. If the installed version is older, /skill-creator will emit subagent definitions that use the reduced pre-2.0 surface."
  },
  "authoring_surface": {
    "plugin_json_fields": ["name", "version", "description", "author", "homepage", "repository", "license", "keywords", "commands", "agents", "hooks", "mcpServers"],
    "subagent_frontmatter_fields": ["description", "prompt", "tools", "disallowedTools", "model", "permissionMode", "mcpServers", "hooks", "maxTurns", "skills", "initialPrompt", "memory", "effort", "background", "isolation", "color"],
    "plugin_subagent_stripped_fields": ["hooks", "mcpServers", "permissionMode"],
    "hook_events": ["PreToolUse", "PostToolUse", "Stop", "SubagentStop", "SessionStart", "SessionEnd", "UserPromptSubmit", "PreCompact", "Notification"],
    "mcp_server_types": ["stdio", "sse", "http"],
    "output_formats_ant": ["auto", "explore", "json", "jsonl", "pretty", "raw", "yaml"],
    "subagent_scopes_ordered": ["managed", "project", "user", "plugin", "cli-ephemeral"]
  },
  "watch_for": [
    "subagent",
    "agents",
    "plugin",
    "SKILL.md",
    "frontmatter",
    "hook",
    "MCP",
    ".claude-plugin",
    "${CLAUDE_PLUGIN_ROOT}",
    "permissionMode",
    "managed settings"
  ],
  "surface_freshness": {
    "last_verified": "2026-04-22",
    "verified_by": "anthropic",
    "verified_against": "2.0.0"
  }
}
```

Why this file is structured differently from `it-admin/ant-pin.json`:

The thing being pinned isn't just a binary version — it's the **plugin authoring surface**. What valid frontmatter fields can a subagent have? Which ones get stripped when loaded from a plugin? Which hook events exist? Claude Code's CHANGELOG changes these routinely, and a plugin author who writes against an older surface will generate subagents that silently fail on newer Claude Code installs (extra fields get ignored) or break on older ones (fields that don't exist yet).

`authoring_surface` captures the ground truth the skills in this plugin rely on. When `/cc-version-check` detects a drift, it compares installed Claude Code's help output and release notes against this object to flag specific surface changes.

## `platform-engineering/commands/cc-version-check.md`

```markdown
---
description: Check Claude Code's version and surface changes against the plugin authoring pin
allowed-tools: Bash(claude:*), Bash(curl:*), Bash(jq:*), Read, Write
argument-hint: "[--fix] [--surface] [--verbose]"
---

Args: `$ARGUMENTS`

## Step 1: Read the pin

Read `${CLAUDE_PLUGIN_ROOT}/cc-pin.json`. Extract `claude_code.pinned_version`, `claude_code.minimum_version`, `claude_code.changelog_sources`, `watch_for`, `authoring_surface`.

## Step 2: Check the binary

Run `claude --version`. Parse.

## Step 3: Compare

Same three-case semver comparison as `it-admin/ant-version-check`: equal → ✓, installed > pinned → fetch CHANGELOG and filter, installed < minimum → refuse.

## Step 4: Fetch CHANGELOG from both sources

Claude Code publishes in two places:
1. GitHub `CHANGELOG.md` — dense, pre-release details, includes internal changes
2. `code.claude.com/docs/en/changelog` — curated user-facing

Prefer the hosted changelog when it's available (less noise). Fall back to GitHub when it's not reachable or when `--verbose` is passed.

```bash
curl -sL "https://code.claude.com/docs/en/changelog" -o /tmp/cc-changelog-hosted.md || \
  curl -sL "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md" -o /tmp/cc-changelog-gh.md
```

## Step 5: Filter for authoring-surface changes

Unlike the `ant` version check, which keeps all Features and BREAKING bullets, this command filters *harder*. Most Claude Code changes don't affect plugin authors — new `/tui` modes, keybinding changes, Remote Control improvements. Keep only bullets that match:

- Any string in `watch_for` (case-insensitive)
- Mentions of frontmatter fields in `authoring_surface.subagent_frontmatter_fields`
- Mentions of hook events in `authoring_surface.hook_events`
- Mentions of `plugin.json` fields in `authoring_surface.plugin_json_fields`
- Anything under a "Plugins" or "Subagents" section heading

Drop aggressively:
- UI changes (TUI, keybindings, notifications)
- Remote Control changes unrelated to plugins
- Model-specific changes (unless they affect how skills/agents declare model)
- Pure bug fixes that don't mention the surface

## Step 6: Surface audit (--surface flag)

If `--surface` is passed, after reporting version diffs, also run a *live surface check*:

1. Run `claude --agents '{}' --help 2>&1` to get the current help output for the --agents flag
2. Parse the list of valid frontmatter fields out of the help text
3. Diff against `authoring_surface.subagent_frontmatter_fields` in the pin
4. Report any added fields (update the skill) or removed fields (fix the skill immediately)

This catches drift that didn't make it into a CHANGELOG entry but is visible in the help output. It's slower (actually invokes `claude`) so it's opt-in.

## Step 7: Report

For a matched version with no surface drift:
```
✓ Claude Code 2.0.0 matches the pinned version. Authoring surface verified 2026-04-22.
```

For a newer installed version with relevant changes:
```
Claude Code version report
──────────────────────────
Installed:       2.1.0 (2026-05-03)
Plugin pinned:   2.0.0 (2026-04-17)
Status:          ahead by 1 release
CHANGELOG:       code.claude.com/docs/en/changelog (hosted)

Relevant changes affecting plugin authoring:

  2.1.0 — Plugins
    • Added `resourceUrls` field to plugin.json for linking external docs
    • Subagent `background: true` now supports `backgroundTimeout` (seconds)

  2.1.0 — Subagents
    • New hook event `SubagentStart` (fires before a subagent's first turn)
      → `cc-pin.json` authoring_surface.hook_events needs updating

No breaking changes detected for plugin authors.

Recommendation:
  • Run /cc-version-check --fix to bump the pin to 2.1.0
  • Update skills/plugin-architecture/ to document `resourceUrls`
  • Update skills/hooks-authoring/ to document `SubagentStart`
```

## Step 8: --fix behavior

If `--fix` and installed > pinned:
1. Ask the user to confirm the bump
2. Update `cc-pin.json`: `claude_code.pinned_version` → installed, `surface_freshness.last_verified` → today's date, `verified_by` → "user" (or whatever `git config user.name` returns if not "user"), `verified_against` → installed version
3. For each surface change detected, print a to-do the user should work through before calling the pin verified
4. Set `surface_freshness.verified_by` to `"pending"` until the user confirms the surface has been re-audited against the skills — prevents silent approval of a drifted pin
```

## `platform-engineering/skills/cc-surface-management/SKILL.md`

```markdown
---
name: cc-surface-management
description: >
  Track Claude Code changes that affect plugin authoring. Use when generating a new
  plugin (to confirm the current surface), when a plugin's hooks or subagents are
  failing in unexpected ways, or when the user asks "what changed in Claude Code".
---

## What this skill does

Claude Code's plugin authoring surface evolves. New subagent frontmatter fields appear, hook events get added, `plugin.json` grows new keys. This plugin's skills tell Claude how to write plugins — but those skills are only as accurate as the authoring surface they were written against.

This skill is the bridge. It:
1. Tells Claude which surface version the other skills assume (by reading `cc-pin.json`)
2. Fetches the current CHANGELOG from the two official sources
3. Flags drift between the pin and reality
4. Reminds Claude to update the other skills when surface changes are detected

## When to load

- At the start of any `/plugin-new` or `/skill-creator` invocation
- When a user reports a plugin behavior that doesn't match the skills' documentation
- When `/cc-version-check` detects drift

## Two changelog sources

1. **GitHub** (`anthropics/claude-code/CHANGELOG.md`) — release-please generated, dense, includes internal churn
2. **Hosted** (`code.claude.com/docs/en/changelog`) — curated, user-facing, usually 1-2 versions behind GitHub

The hosted version is the better source for plugin authoring signal. It's already filtered by Anthropic's docs team. Pull GitHub only when the hosted version is stale or unavailable.

## Parsing release-please CHANGELOG

Same structure as the `ant` CLI's CHANGELOG:

```
## 2.1.0 (2026-05-03)

### Features

* **plugins**: add resourceUrls field to plugin.json (#1234)
* **subagents**: new hook event SubagentStart (#1235)

### Bug Fixes

* **tui**: fix flicker on fullscreen toggle (#1230)

### Chores

* **internal**: bump @anthropic-ai/sdk to ^0.81.0
```

Per-bullet filtering rules for authoring-surface relevance:

| Keep if it mentions... | Skip if it's... |
|------------------------|-----------------|
| `subagent`, `agents/`, `.claude/agents/` | TUI, keybinding, `/tui`, focus, rendering |
| `plugin.json`, `.claude-plugin/` | Remote Control (unless plugin-related) |
| `SKILL.md`, `frontmatter`, `skills/` | Model-specific (unless it affects `model:` field) |
| `hook`, any event name from `hook_events` | Pure internal (`chore(internal):`, `ci:`, `codegen`) |
| `MCP`, `mcpServers`, `.mcp.json` | Session resume, `/resume`, `/branch` |
| `${CLAUDE_PLUGIN_ROOT}` | Cache TTL, rate limiting |
| `permissionMode`, `managed settings` | Bedrock/Vertex/Foundry (unless auth-related) |

## The authoring surface object

`cc-pin.json` has an `authoring_surface` object listing every field, event, and type the skills in this plugin document. Treat this as the ground truth when generating skills/agents/hooks:

- `plugin_json_fields` — valid keys in `.claude-plugin/plugin.json`
- `subagent_frontmatter_fields` — valid keys in a subagent's YAML frontmatter (and in `--agents` JSON)
- `plugin_subagent_stripped_fields` — fields that are silently ignored when loading from a plugin
- `hook_events` — events a hook can match on
- `mcp_server_types` — transports for `.mcp.json` entries
- `subagent_scopes_ordered` — precedence order when multiple scopes define the same subagent

When you edit a skill in this plugin, check that every field/event/type name it mentions is in `authoring_surface`. If a skill documents something not in the list, either the skill is wrong or the pin is out of date. Either way, resolve it before shipping.

## Drift detection without a CHANGELOG

Sometimes Claude Code adds a surface feature that doesn't make it into the CHANGELOG immediately (edge case but happens). The `--surface` flag on `/cc-version-check` catches these by parsing live help output:

```bash
claude --agents '{}' --help 2>&1 | grep -oP '(?<=--)[a-zA-Z]+' | sort -u
```

Compare that list to `authoring_surface.subagent_frontmatter_fields`. Any new flag is a potential new field worth documenting.

## When to bump

Bump the pin when:
- The user has verified the authoring surface matches what the skills document
- `--surface` shows no drift against the installed version
- A human has reviewed the CHANGELOG bullets the filter surfaced

Don't auto-bump. The pin is a contract: "these skills are accurate against this version." Silent bumps are how surface rot enters the plugin.

## Docs

- Claude Code: https://github.com/anthropics/claude-code
- CHANGELOG (GitHub): https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- CHANGELOG (hosted): https://code.claude.com/docs/en/changelog
- Subagent docs: https://code.claude.com/docs/en/sub-agents
- Plugin docs: https://code.claude.com/docs/en/plugins
```

## `platform-engineering/hooks/hooks.json`

```json
{
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "If the user is about to use /plugin-new, /skill-creator, or /plugin-customizer in this session, silently verify the Claude Code version matches or exceeds the minimum in ${CLAUDE_PLUGIN_ROOT}/cc-pin.json. Only surface the check to the user if there is a mismatch. Do NOT run claude --version more than once per session. Do not annoy the user if they haven't invoked a platform-engineering command yet.",
          "timeout": 10
        }
      ]
    }
  ]
}
```

## `platform-engineering/commands/skill-creator.md`

```markdown
---
description: Scaffold a new skill (SKILL.md + references/ + examples/) with good defaults
allowed-tools: Read, Write, Edit, Bash(mkdir:*), Bash(ls:*), Grep, Glob
argument-hint: "<skill-name> [--in <plugin-dir>] [--user | --project]"
---

Parse `$ARGUMENTS` for skill name, target location, and scope.

**Resolution**:
- `--in <dir>` → write to `<dir>/skills/<name>/`
- `--project` → write to `.claude/skills/<name>/` (if the project uses that layout)
- `--user` → write to `~/.claude/skills/<name>/`
- No flag → infer from CWD (is there a `.claude-plugin/plugin.json`? if yes, assume plugin)

**Interview the user** (use only the questions that aren't already answered):
1. What trigger phrases should make Claude load this skill? (2–5 specific phrases)
2. What knowledge domain does it cover?
3. Does it need reference files (`references/`) for deeper content?
4. Does it need bundled examples (`examples/`)?
5. Does it need utility scripts (`scripts/`)?

**Generate**:
- `SKILL.md` with YAML frontmatter (name, description in third person with trigger phrases, optional metadata)
- `references/` directory with a placeholder file if requested
- `examples/` directory if requested
- `scripts/` directory if requested

**Apply writing rules**:
- Frontmatter `description`: third-person ("This skill should be used when...") with specific trigger phrases in quotes
- Body: imperative voice ("Parse the input", not "You should parse the input")
- Body length: under ~3000 words; push detail into `references/`

**Validate**:
- Skill name matches directory name
- Frontmatter parses as valid YAML
- No `$` variables in frontmatter that Claude Code doesn't support
```

## `platform-engineering/commands/plugin-customizer.md`

```markdown
---
description: Customize an existing plugin by filling ~~ placeholders and wiring MCPs
allowed-tools: Read, Write, Edit, Bash(grep:*), Bash(find:*), Grep, Glob
argument-hint: "<plugin-dir>"
---

Plugin to customize: `$ARGUMENTS`

## Phase 0: Locate the plugin

Verify `<plugin-dir>/.claude-plugin/plugin.json` exists. If not, abort with a clear message.

## Phase 1: Determine customization mode

Run: `grep -rn '~~\w' <plugin-dir> --include='*.md' --include='*.json'`

- If `~~` placeholders exist → **generic setup mode**: fill them in
- If none exist and the user asked about a specific area → **scoped mode**: only touch that area
- Otherwise → **general mode**: read the plugin, ask what to change

## Phase 2: Gather context

Check for knowledge MCPs (Slack, GDrive, Atlassian, etc.). If available, search for:
- Tool names the org uses (GitHub/GitLab, Jira/Linear/Asana, etc.)
- Channel/team naming conventions
- Workflow terminology

If no knowledge MCPs → skip to direct Q&A with the user.

## Phase 3: Build a todo list

Group customization items by theme. Use plain-language descriptions — never mention `~~` or placeholders to the user.

- **Good**: "Tell Claude which project tracker your team uses"
- **Bad**: "Replace `~~project tracker` in skills/standup/SKILL.md"

## Phase 4: Work through items

For each item:
1. If Phase 2 found an answer → apply directly
2. Otherwise → ask the user (one question at a time, never bundled)

## Phase 5: MCPs

For any tool identified during customization, check whether its MCP server is connected (if a registry is available). Update `<plugin-dir>/.mcp.json` with the right `url`.

## Phase 6: Validate and package

Run `claude plugin validate <plugin-dir>/.claude-plugin/plugin.json`. Fix any errors, then offer `/plugin-package`.
```

## `platform-engineering/commands/plugin-new.md`

```markdown
---
description: Scaffold a new Claude Code plugin from scratch
allowed-tools: Read, Write, Edit, Bash(mkdir:*), Bash(git:*), Glob
argument-hint: "<plugin-name>"
---

Plugin name to create: `$ARGUMENTS`

## Phase 1: Discovery

Ask:
- What should this plugin do?
- Who will use it?
- Does it integrate with external services?

## Phase 2: Component planning

Based on discovery, recommend which components to include:

| Component        | When to include                                                  |
|------------------|------------------------------------------------------------------|
| Skills           | Domain knowledge Claude should load on demand                    |
| Commands (slash) | User-initiated actions (still supported, first-class in CLI)     |
| Subagents        | Multi-step autonomous tasks with isolated context                |
| Hooks            | Auto-run on events (PreToolUse, SessionStart, etc.)              |
| MCP servers      | External service integration                                     |

Present the plan as a table. Get user confirmation.

## Phase 3: Design

For each chosen component type, ask 2–4 targeted design questions. Don't assume defaults — use AskUserQuestion.

## Phase 4: Scaffold

Create the directory tree:
```
<plugin-name>/
├── .claude-plugin/plugin.json
├── skills/           (if any)
├── commands/         (if any)
├── agents/           (if any)
├── hooks/hooks.json  (if any)
├── .mcp.json         (if any)
└── README.md
```

Generate each file with good defaults. Use `${CLAUDE_PLUGIN_ROOT}` for all intra-plugin paths.

## Phase 5: Validate

Run `claude plugin validate`. Fix errors.

## Phase 6: Offer next steps

- `/plugin-package` to zip
- `git init` + commit
- Install locally: `claude plugins add ./<plugin-name>`
```

## `platform-engineering/skills/subagent-authoring/SKILL.md`

```markdown
---
name: subagent-authoring
description: >
  Write Claude Code subagent definitions correctly. Use when creating or editing files in
  .claude/agents/, ~/.claude/agents/, or a plugin's agents/ directory, or when generating
  JSON for claude --agents.
---

Subagents live in YAML frontmatter + markdown body files, or as JSON passed to `claude --agents`.

## Supported frontmatter fields

All fields the `--agents` flag accepts (same as file-based):

| Field             | Type              | Notes                                                                          |
|-------------------|-------------------|--------------------------------------------------------------------------------|
| `description`     | string (required) | Triggering conditions; use `<example>` blocks                                  |
| `prompt`          | string            | System prompt (equivalent to markdown body in file-based subagents)            |
| `tools`           | array             | Allowlist — omit to inherit all parent tools                                   |
| `disallowedTools` | array             | Denylist                                                                       |
| `model`           | string            | `inherit`, `sonnet`, `opus`, `haiku`                                           |
| `permissionMode`  | string            | `default`, `acceptEdits`, `bypassPermissions`, `plan` — **not valid in plugins** |
| `mcpServers`      | object            | Per-subagent MCP config — **not valid in plugins**                             |
| `hooks`           | object            | Per-subagent hooks — **not valid in plugins**                                  |
| `maxTurns`        | number            | Turn budget for the subagent                                                   |
| `skills`          | array             | Skill names to make available                                                  |
| `initialPrompt`   | string            | First user message to seed the conversation                                    |
| `memory`          | object            | Memory configuration                                                           |
| `effort`          | string            | `low`, `medium`, `high`                                                        |
| `background`      | boolean           | Run as a background task                                                       |
| `isolation`       | string            | Context isolation strategy                                                     |
| `color`           | string            | `blue`, `cyan`, `green`, `yellow`, `magenta`, `red`                            |

## Scope precedence (highest wins)

1. Managed (`<managed-settings>/.claude/agents/`)
2. Project (`.claude/agents/`)
3. User (`~/.claude/agents/`)
4. Plugin (`<plugin>/agents/`)
5. CLI ephemeral (`--agents '{...}'`)

## Plugin subagent restrictions

`hooks`, `mcpServers`, `permissionMode` are **stripped** when loading from a plugin. If a subagent needs them, copy to `.claude/agents/` or `~/.claude/agents/` instead. Users can also add rules to `permissions.allow` in `settings.json`, but those apply to the whole session.

## Hot reload

Subagents are loaded at session start. After editing a file, run `/agents` or restart the session.

## JSON form (`--agents`)

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

Useful for ephemeral agents in CI or one-off scripts. Multiple subagents can be defined in one call.

## File template

```markdown
---
name: my-agent
description: Use this agent when the user asks to <trigger>.

<example>
Context: <situation>
user: "<what the user might say>"
assistant: "I'll use the my-agent agent to <action>."
</example>

model: inherit
color: cyan
tools: ["Read", "Grep"]
---

You are a <role>. <core responsibilities>.

**Process**:
1. ...
2. ...

**Output format**:
- ...
```
```

## `platform-engineering/skills/plugin-architecture/SKILL.md`

```markdown
---
name: plugin-architecture
description: >
  Reference for Claude Code plugin layout, plugin.json fields, and ${CLAUDE_PLUGIN_ROOT}.
  Use when creating, validating, or debugging a plugin's structure.
---

## Required layout

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # Required
├── skills/<name>/SKILL.md  # Optional
├── commands/<name>.md      # Optional
├── agents/<name>.md        # Optional
├── hooks/hooks.json        # Optional
├── .mcp.json               # Optional
└── README.md
```

## plugin.json

Minimum:
```json
{ "name": "my-plugin" }
```

Common fields: `version` (semver, start at `0.1.0`), `description`, `author` (object with `name`), `homepage`, `repository`, `license`, `keywords`.

Custom paths (supplement auto-discovery):
```json
{
  "commands": "./custom-commands",
  "agents": ["./agents", "./specialized-agents"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

## `${CLAUDE_PLUGIN_ROOT}`

Always use this variable for intra-plugin paths in hooks and MCP configs. Never hardcode. It resolves to the installed plugin directory at runtime.

## Validation

`claude plugin validate <path-to-plugin-json>` checks:
- Valid JSON
- Kebab-case name
- Referenced component directories exist
- Skills have `SKILL.md`
- YAML frontmatter parses
```

## Other `platform-engineering/skills/` (abbreviated)

- `skill-writing/SKILL.md` — progressive disclosure, trigger phrases, imperative voice (port from Cowork's `create-cowork-plugin/references/component-schemas.md`, skills section)
- `mcp-integration/SKILL.md` — three server types (stdio/sse/http), env var expansion, category-to-keywords mapping
- `hooks-authoring/SKILL.md` — event list, matchers, prompt vs command hooks, output format

---

# 3. `it-admin`

Wraps the Anthropic Admin API via `ant`, the official Claude Platform CLI (`github.com/anthropics/anthropic-cli`). One skill per endpoint family, taking advantage of `ant`'s `--transform` (GJSON) and `--format` flags to keep Claude's job to orchestration rather than JSON wrangling.

## `it-admin/.claude-plugin/plugin.json`

```json
{
  "name": "it-admin",
  "version": "0.1.0",
  "description": "Manage your Anthropic organization from Claude Code via the ant CLI: users, workspaces, API keys, invites, usage/cost, Claude Code analytics, data retention. Full Admin API coverage.",
  "author": { "name": "Anthropic" },
  "keywords": ["admin", "organization", "usage", "billing", "workspaces", "ant"]
}
```

## `it-admin/README.md`

```markdown
# it-admin

Full coverage of the Anthropic Admin API from the Claude Code CLI, powered by **`ant`** — the official Claude Platform CLI from `github.com/anthropics/anthropic-cli`.

## Prerequisites

Install `ant`:

```bash
# Homebrew
brew install anthropics/tap/ant

# or Go
go install github.com/anthropics/anthropic-cli/cmd/ant@latest
```

Verify: `ant --version`.

## Auth

Admin API calls require an **Admin API key** (created by an org owner in the Anthropic Console — separate from regular API keys).

```bash
# Option 1: env var (recommended for shells and CI)
export ANTHROPIC_AUTH_TOKEN="sk-ant-admin01-..."

# Option 2: flag per call
ant --auth-token sk-ant-admin01-... ...
```

`ant` reads `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` automatically. For Admin endpoints, `ANTHROPIC_AUTH_TOKEN` is the right one.

## Commands

| Command                   | Purpose                                                  |
|---------------------------|----------------------------------------------------------|
| `/org-info`               | Show info about the current organization                 |
| `/list-workspaces`        | List all workspaces                                      |
| `/workspace`              | Create, update, archive a workspace                      |
| `/list-users`             | List org members                                         |
| `/user`                   | Get, invite, remove, or update a user                    |
| `/list-invites`           | List pending invites                                     |
| `/list-keys`              | List API keys (optionally filter by workspace or status) |
| `/rotate-key`             | Rotate a key                                             |
| `/usage`                  | Usage API — messages/tokens by time period               |
| `/cost`                   | Cost API — spend breakdown                               |
| `/claude-code-analytics`  | Claude Code Analytics API — activity, acceptance, etc.   |
| `/data-retention`         | Inspect and update data retention settings               |

## Skills (one per endpoint family)

- `ant-cli-basics` — How to invoke `ant`, pick a format, and transform output with GJSON
- `admin-organizations` — `/v1/organizations/me`
- `admin-workspaces` — list / create / update / archive
- `admin-workspace-members` — manage members in a workspace
- `admin-users` — list / get / update / remove org members
- `admin-invites` — create / list / cancel invites
- `admin-api-keys` — list / get / update / rotate
- `admin-usage` — Usage API
- `admin-cost` — Cost API
- `admin-claude-code-analytics` — Claude Code Analytics API
- `admin-data-retention` — retention config

## Subagents

- `usage-reporter` — generates a monthly usage + cost report as markdown
- `access-auditor` — scans users, workspaces, and keys for stale or over-privileged access
- `onboarding-wizard` — walks through inviting a user, assigning a workspace, and generating their first key

## Output formats

`ant` supports: `auto`, `explore`, `json`, `jsonl`, `pretty`, `raw`, `yaml`. This plugin defaults to `json` for programmatic parsing and switches to `pretty` when presenting directly to the user.

## GJSON transforms

Use `--transform '<gjson>'` to reshape output server-side (in the CLI) so Claude doesn't parse noise. Example:

```bash
ant admin workspaces list --format json \
  --transform 'data.#(archived_at!=null)#.{id,name,archived_at}'
```
```

## `it-admin/.mcp.json`

```json
{
  "mcpServers": {}
}
```

(No MCP needed — all operations go through `ant` via Bash.)

## Version pinning

`it-admin` pins the `ant` version it was built against, so Claude can:

1. Tell the user immediately if they're on an older version that's missing a flag
2. Read the CHANGELOG between the pinned version and the installed version and surface relevant bullets (new flags, renamed resources, breaking changes)
3. Adjust its command invocations — e.g., fall back to curl for an endpoint `ant` doesn't yet expose

## `it-admin/ant-pin.json`

```json
{
  "pinned_version": "1.2.1",
  "minimum_version": "1.2.0",
  "changelog_url": "https://raw.githubusercontent.com/anthropics/anthropic-cli/main/CHANGELOG.md",
  "repo_url": "https://github.com/anthropics/anthropic-cli",
  "version_notes": {
    "1.2.1": {
      "verified": true,
      "notes": "Admin API resources verified: organizations/me, workspaces, workspace-members, users, invites, api-keys, usage-report messages, cost-report."
    }
  },
  "known_breaking_changes": [],
  "watch_for": [
    "claude-code-analytics",
    "data-retention",
    "admin/"
  ]
}
```

Fields:
- `pinned_version` — the version this plugin was authored against. Every skill's examples assume this version's flag spelling.
- `minimum_version` — below this, `/ant-version-check` errors out rather than warns.
- `changelog_url` — where to fetch CHANGELOG.md to diff.
- `version_notes` — per-version plugin-author notes (verified endpoints, caveats).
- `known_breaking_changes` — structured list; each entry has `introduced_in`, `resource`, `description`, `migration`.
- `watch_for` — strings to grep for in CHANGELOG entries when diffing versions. Determines which bullets surface.

## `it-admin/commands/ant-version-check.md`

```markdown
---
description: Verify the installed ant CLI version against what this plugin was built against, and surface relevant CHANGELOG entries
allowed-tools: Bash(ant:*), Bash(curl:*), Bash(cat:*), Read
argument-hint: "[--fix] [--verbose]"
---

Args: `$ARGUMENTS`

## Step 1: Read the pin

Read `${CLAUDE_PLUGIN_ROOT}/ant-pin.json`. Extract `pinned_version`, `minimum_version`, `changelog_url`, `watch_for`.

## Step 2: Check the binary

Run `ant --version` and capture stdout.

- If `ant` is missing → print the install instructions (`brew install anthropics/tap/ant` or `go install github.com/anthropics/anthropic-cli/cmd/ant@latest`) and exit
- If `ant` is present → parse the version number

## Step 3: Compare

Three cases:

1. **installed == pinned** → "✓ ant <version> matches the pinned version. No compatibility concerns."
2. **installed > pinned** → fetch CHANGELOG, show relevant entries newer than `pinned_version`, ask whether the user wants Claude to bump the pin (only if `--fix` was passed).
3. **installed < pinned** → warn; if `installed < minimum_version`, refuse to proceed and tell the user to upgrade.

Use semver comparison (major.minor.patch). `1.2.10 > 1.2.9`, not the other way around.

## Step 4: Diff the CHANGELOG (for newer installed versions)

```bash
curl -sL "<changelog_url>" -o /tmp/ant-changelog.md
```

Parse the markdown. The CHANGELOG follows release-please conventions: each version is a `##` heading (`## 1.2.1 (YYYY-MM-DD)`), with bulleted sections like `### Features`, `### Bug Fixes`, `### Chores`.

Extract all bullets from versions strictly greater than `pinned_version`, up to and including the installed version.

**Relevance filter**: keep a bullet if any of these are true:
- It contains a string from `watch_for` (case-insensitive substring match on each item)
- It's under a `### Features` or `### BREAKING CHANGES` heading
- It mentions `admin`, `cli`, `flag`, `rename`, `deprecat`, `remove`

Skip bullets that look purely internal: `chore(internal):`, `ci:`, `chore: sync repo`, `release:`, bullets consisting only of a commit hash.

## Step 5: Present the report

If everything matches → single-line success.

Otherwise, format:

```
ant version report
──────────────────
Installed:  1.3.0 (2026-04-28)
Pinned in plugin:  1.2.1 (2026-04-17)
Status:  ahead by 2 releases

Relevant changes since 1.2.1:

  1.3.0 — Features
    • Added admin claude-code-analytics get command (previously curl-only)
    • Added --after-id pagination helper to admin workspaces list

  1.3.0 — Bug Fixes
    • Fixed admin cost-report returning wrong currency on some orgs

  1.2.2 — BREAKING CHANGES
    • Renamed admin usage to admin usage-report messages
      → Migration: update any scripts calling `ant admin usage`

Recommendation:
  • Run /ant-version-check --fix to bump the plugin's pin to 1.3.0
  • New commands are available — consider regenerating skills
```

If installed < minimum:
```
ant version too old
───────────────────
Installed:  1.1.0
Minimum required:  1.2.0

Upgrade with:
  brew upgrade ant
  # or
  go install github.com/anthropics/anthropic-cli/cmd/ant@latest

This plugin relies on the resource structure introduced in 1.2.0.
Commands will fail on older versions.
```

## Step 6: --fix behavior

If `--fix` was passed and the installed version is newer than pinned:

1. Ask the user to confirm the bump
2. Update `ant-pin.json`: set `pinned_version` to the installed version, add a `version_notes` entry with today's date and "verified: false"
3. Remind the user to re-verify the skills in this plugin against the new version's help output

Never auto-bump without explicit confirmation. Version pins are a contract with the user's ops team.
```

## `it-admin/skills/ant-version-management/SKILL.md`

```markdown
---
name: ant-version-management
description: >
  Detect ant CLI version mismatches and surface relevant CHANGELOG entries. Use when
  a user reports an ant command failing, when the plugin's commands look wrong,
  or when the user asks "what's new in ant", "did ant break something", or
  "am I on the right version".
---

## When to invoke

- Before running any destructive `ant admin` command if the version hasn't been checked this session
- When an `ant` invocation returns "unknown command", "unknown flag", or "resource not found"
- When the user explicitly asks about the CLI version or recent changes

## The pin

`it-admin/ant-pin.json` records the `ant` version this plugin was built against. Every skill's example invocations assume this version's flag spelling. When `ant` is newer, new commands may exist that the skills don't use yet (fine — existing commands still work). When `ant` is older, commands may fail.

## Version comparison

Use semver. Prefer a simple shell pipeline over Bash's `[[`:

```bash
installed="$(ant --version | awk '{print $NF}' | sed 's/^v//')"
pinned="$(jq -r .pinned_version ${CLAUDE_PLUGIN_ROOT}/ant-pin.json)"
printf '%s\n%s\n' "$installed" "$pinned" | sort -V | head -1
```

If the head is the pinned version, installed >= pinned.

## CHANGELOG parsing

`ant`'s CHANGELOG is generated by release-please. Structure:

```
## 1.2.1 (2026-04-17)

### Features

* **cli**: switch long lists of positional args over to param structs ([#29](...))

### Bug Fixes

* fix for failing to drop invalid module replace in link script ([abc1234](...))

### Chores

* **internal**: codegen related update
```

Keep a bullet if:
- It's under `### Features` (users likely want to know new capabilities)
- It's under `### BREAKING CHANGES` (users MUST know)
- It matches a string in `ant-pin.json`'s `watch_for` array
- It mentions `admin`, `cli`, `flag`, `rename`, `deprecat`, `remove`

Drop:
- `### Chores` with `internal:`, `codegen`, `sync repo`, `gitignore`
- Bullets that are just a commit hash or release PR link
- CI-only changes (`ci:`, `.github/`, `goreleaser`)

## Version bump workflow

When installed > pinned and the user runs `/ant-version-check --fix`:

1. Fetch CHANGELOG, extract entries from `pinned_version..installed`
2. Show the filtered bullets
3. Ask: "Bump plugin pin to `<installed>`? Any skills referencing renamed resources may need updating."
4. On confirmation, update `ant-pin.json`
5. For each entry in the CHANGELOG mentioning a renamed resource (look for `rename`, `deprecat`, `move`), suggest running `/plugin-validate` (from `platform-engineering`) against this plugin

## Minimum version

If installed < `minimum_version`, refuse to run admin commands. Print upgrade instructions and exit. This prevents silent failures on stale installations.

## Why pin?

Without a pin, Claude assumes the latest `ant` surface, which may not match what's installed. The user sees cryptic "unknown flag" errors from `ant`, not a clear message from the plugin. Pinning turns those into actionable diagnostics.

## Docs

- Installed CLI: `github.com/anthropics/anthropic-cli`
- CHANGELOG: https://github.com/anthropics/anthropic-cli/blob/main/CHANGELOG.md
- Claude Code CHANGELOG pattern (reference): https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- Claude Code hosted changelog: https://code.claude.com/docs/en/changelog
```

## `it-admin/hooks/hooks.json`

```json
{
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "If the user is about to use any it-admin command in this session, verify ant is installed and its version matches or exceeds the minimum in ${CLAUDE_PLUGIN_ROOT}/ant-pin.json. If ant is missing, tell the user how to install it. If the version is below minimum, refuse and show upgrade instructions. Do NOT run ant --version more than once per session — cache the result. Do not annoy the user with a version check if they haven't invoked any it-admin command yet.",
          "timeout": 10
        }
      ]
    }
  ]
}
```

## `it-admin/skills/ant-cli-basics/SKILL.md`

```markdown
---
name: ant-cli-basics
description: >
  How to invoke the ant CLI (Claude Platform CLI) correctly. Use whenever a command
  in this plugin needs to shell out to ant, or when the user asks "how do I call
  the Admin API from the terminal".
---

## Command shape

```
ant [resource] <command> [flags...]
```

Resource-based. Every Admin API endpoint family has a resource (e.g., `admin/organizations`, `admin/workspaces`, `admin/users`, `admin/api_keys`, `admin/invites`, `admin/usage_report`, `admin/cost_report`).

## Global flags that matter

| Flag                 | Purpose                                                           |
|----------------------|-------------------------------------------------------------------|
| `--auth-token`       | Admin API key (or set `ANTHROPIC_AUTH_TOKEN`)                     |
| `--api-key`          | Standard API key (or set `ANTHROPIC_API_KEY`) — not for Admin     |
| `--format`           | `auto`, `explore`, `json`, `jsonl`, `pretty`, `raw`, `yaml`       |
| `--format-error`     | Same set, applied to error output                                 |
| `--transform`        | GJSON expression applied to success output                        |
| `--transform-error`  | GJSON expression applied to error output                          |
| `--base-url`         | Override API backend (e.g., Bedrock, Vertex, Foundry proxy)       |
| `--debug`            | Include HTTP request/response in stderr — useful when diagnosing  |
| `--help`             | Command-specific usage                                            |
| `-v`, `--version`    | CLI version                                                       |

## Output format selection

- `--format json` — default for this plugin when Claude needs to parse
- `--format jsonl` — for large list responses; one record per line, streams
- `--format pretty` — for showing the user directly
- `--format yaml` — human-friendly structured output
- `--format explore` — interactive browse; **do not use in non-interactive Bash**
- `--format raw` — unprocessed API response

When a command's output goes back to Claude for summarization, use `json`. When it goes directly to the user's terminal, use `pretty`.

## GJSON transforms

`--transform` evaluates a [GJSON](https://github.com/tidwall/gjson) expression against the response. Common patterns:

```bash
# Pluck specific fields from each item in a list
ant admin workspaces list --format json --transform 'data.#.{id,name,created_at}'

# Filter then project
ant admin api_keys list --format json \
  --transform 'data.#(status=="active")#.{id,name,workspace_id}'

# Count matches
ant admin users list --format json --transform 'data.#(role=="admin")#|#'

# Sort and take top 5
ant admin workspaces list --format json \
  --transform 'data|@sort:"created_at"|@reverse|0:5'
```

Using `--transform` saves tokens and reduces the chance of parsing mistakes.

## Passing files

If a command accepts a file argument (e.g., a JSON policy doc):

```bash
ant admin whatever --config @policy.json
```

Use `@file://path` to force plain-text encoding or `@data://path` for base64.

## Escape hatch: using curl

If `ant` doesn't yet expose a specific endpoint, fall back to:

```bash
curl https://api.anthropic.com/v1/organizations/me \
  -H "x-api-key: $ANTHROPIC_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01"
```

But always prefer `ant` when it supports the endpoint — it handles auth, retries, and formatting consistently.

## Checking what's available

```bash
ant --help               # top-level resource list
ant admin --help         # admin-scoped resources
ant admin workspaces --help   # workspace subcommands
```

If a subcommand documented here is missing in a user's `ant` version, check `ant --version` and suggest `brew upgrade ant` or reinstall with Go.
```

## `it-admin/commands/org-info.md`

```markdown
---
description: Show info about the current Anthropic organization
allowed-tools: Bash(ant:*)
---

Run: `ant admin organizations me --format json`

If the user wants a human-readable view, rerun with `--format pretty` and pipe directly to stdout.

Parse the JSON. Present:
- Organization name
- Organization ID
- Plan / tier (if returned)
- Created at

For counts (workspaces, users, keys), chain follow-up calls only if the user asks — don't pre-fetch.

Endpoint: `GET /v1/organizations/me`
Docs: https://platform.claude.com/docs/en/api/admin/organizations/me
```

## `it-admin/commands/list-workspaces.md`

```markdown
---
description: List all workspaces in the organization
allowed-tools: Bash(ant:*)
argument-hint: "[--archived] [--format pretty|json|csv]"
---

Base: `ant admin workspaces list --format json`

Flags:
- `--archived` → add `--transform 'data.#(archived_at!=null)#'` to filter for archived workspaces only
- `--format pretty` → rerun `ant` with `--format pretty` and print directly
- `--format csv` → use `--transform 'data.#.[id,name,created_at,archived_at,display_color]'` then convert to CSV in Bash

For each workspace in the rendered output, show: `id`, `name`, `created_at`, `archived_at` (if present), `display_color`.

If the response is paginated (`has_more: true`), call again with `--after-id <last-id>` and combine.
```

## `it-admin/commands/usage.md`

```markdown
---
description: Query the Usage Report API for messages and tokens over a time period
allowed-tools: Bash(ant:*), Bash(jq:*)
argument-hint: "[--start YYYY-MM-DD] [--end YYYY-MM-DD] [--workspace <id>] [--group-by model|workspace|api_key]"
---

Resolve arguments. Defaults:
- `--start` = first of current month
- `--end` = today
- `--group-by` = workspace

Run:

```bash
ant admin usage-report messages \
  --starting-at <start>T00:00:00Z \
  --ending-at   <end>T23:59:59Z \
  --group-by '[<group>]' \
  --format json
```

(The exact parameter names are `starting_at` / `ending_at` / `group_by` in the Admin API; `ant` exposes these as kebab-case flags. Use `ant admin usage-report messages --help` to confirm on the user's version.)

Summarize:
- Total input tokens, output tokens, cache creation tokens, cache read tokens
- Total requests
- Top 5 groups by output tokens
- Day-over-day trend (if `bucket_width=1d` was used) — render an ASCII chart with plotext

Docs: https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
```

## `it-admin/commands/cost.md`

```markdown
---
description: Query the Cost Report API for organization spend
allowed-tools: Bash(ant:*), Bash(jq:*)
argument-hint: "[--start YYYY-MM-DD] [--end YYYY-MM-DD] [--group-by model|workspace]"
---

Resolve arguments. Defaults: start = first of current month, end = today, group by workspace.

Run:

```bash
ant admin cost-report \
  --starting-at <start>T00:00:00Z \
  --ending-at   <end>T23:59:59Z \
  --group-by '[<group>]' \
  --format json
```

Summarize:
- Total cost in USD
- Top 5 groups by spend
- Daily trend
- Month-to-date vs. same period last month (make a second call for the prior-month window)

Warn if daily spend has increased more than 50% compared to the trailing 7-day average.

Docs: https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
```

## `it-admin/commands/claude-code-analytics.md`

```markdown
---
description: Query the Claude Code Analytics API (activity, acceptance rates, etc.)
allowed-tools: Bash(ant:*), Bash(jq:*)
argument-hint: "[--start YYYY-MM-DD] [--end YYYY-MM-DD] [--user <email>] [--workspace <id>]"
---

Run:

```bash
ant admin claude-code-analytics \
  --starting-at <start>T00:00:00Z \
  --ending-at   <end>T23:59:59Z \
  [--user-email <email>] \
  [--workspace-id <id>] \
  --format json
```

If `ant` on the user's version doesn't yet expose this endpoint, fall back to:

```bash
curl -s "https://api.anthropic.com/v1/organizations/claude_code/analytics?starting_at=<start>T00:00:00Z&ending_at=<end>T23:59:59Z" \
  -H "x-api-key: $ANTHROPIC_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01"
```

Summarize:
- Active users (daily, weekly)
- Sessions, tool calls, accepted suggestions
- Acceptance rate trend
- Top users by sessions (org-wide query)
- Per-user breakdown if `--user` was set

Docs: https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api
```

## `it-admin/commands/user.md`

```markdown
---
description: Get, invite, remove, or update a user in the org
allowed-tools: Bash(ant:*)
argument-hint: "<action: get|invite|remove|update> <email> [--role <role>] [--workspace <id>]"
---

Parse `$ARGUMENTS`. Route:

- `get <email>` → `ant admin users list --transform 'data.#(email=="<email>")' --format json`
  (The API lists then you filter; if `ant admin users get` exists on this version, prefer it.)
- `invite <email> --role <role>` → `ant admin invites create --email <email> --role <role> --format json`
- `remove <email>` → confirm, then `ant admin users delete --user-id <id> --format json` (first resolve `<id>` from email)
- `update <email> --role <role>` → `ant admin users update --user-id <id> --role <role> --format json`

For destructive actions (remove, role downgrade), **always confirm** before executing. Print the exact `ant` invocation you're about to run and ask for explicit "yes".

Docs: https://platform.claude.com/docs/en/build-with-claude/administration-api
```

## `it-admin/skills/admin-organizations/SKILL.md`

```markdown
---
name: admin-organizations
description: >
  Retrieve information about the current Anthropic organization via the Admin API.
  Use when the user asks about "our org", "organization ID", "org settings", or
  "who owns this org".
---

Endpoint: `GET /v1/organizations/me`

## CLI

```bash
ant admin organizations me --format json
```

## Response (subject to schema updates)

- `id` — organization ID
- `name` — display name
- `created_at` — ISO timestamp
- plus plan/tier metadata as exposed by the API

## Useful transforms

```bash
# Just the ID
ant admin organizations me --format raw --transform 'id'

# Name and plan only, YAML for humans
ant admin organizations me --format yaml --transform '{name,plan}'
```

## Common uses

- Confirm which org an admin key is scoped to before destructive commands
- Fetch the org ID to use in other Admin API calls
- Sanity-check that `ANTHROPIC_AUTH_TOKEN` is set correctly (a 401 here means the token is wrong or not an Admin key)

Docs: https://platform.claude.com/docs/en/api/admin/organizations/me
```

## `it-admin/skills/admin-usage/SKILL.md`

```markdown
---
name: admin-usage
description: >
  Query the Anthropic Usage Report API for token and request volumes. Use when
  the user asks about "how many tokens did we use", "usage by workspace",
  "usage by model", "our usage last month", or similar.
---

Endpoint family: Usage Report — grouped aggregations of message/token counts.

## CLI

```bash
ant admin usage-report messages \
  --starting-at 2025-01-01T00:00:00Z \
  --ending-at   2025-01-31T23:59:59Z \
  --group-by '["workspace_id"]' \
  --bucket-width 1d \
  --format json
```

### Key parameters

| Flag                   | Values                                                          |
|------------------------|-----------------------------------------------------------------|
| `--starting-at`        | ISO 8601 UTC timestamp                                          |
| `--ending-at`          | ISO 8601 UTC timestamp                                          |
| `--group-by`           | Array: `model`, `workspace_id`, `api_key_id`, `service_tier`, `context_window` |
| `--bucket-width`       | `1h`, `1d`                                                      |
| `--workspace-ids`      | Filter to specific workspaces                                   |
| `--api-key-ids`        | Filter to specific keys                                         |
| `--models`             | Filter to specific models                                       |
| `--service-tiers`      | Filter (`standard`, `priority`, `batch`)                        |

Run `ant admin usage-report messages --help` on the user's version for the exact flag spelling — parameter names have been in flux.

## Response rows

Each row:
- `starting_at`, `ending_at` — bucket boundaries
- Grouping keys (e.g., `workspace_id`, `model`)
- `uncached_input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`
- `server_tool_use` counts (if applicable)
- `web_search_requests`, `code_execution_requests` (when applicable)

## Useful GJSON transforms

```bash
# Total output tokens across the window
... --format raw --transform 'data.#.output_tokens|@sum'

# Top 5 workspaces by output tokens
... --format json --transform 'data|@sort:"output_tokens"|@reverse|0:5|#.{workspace_id,output_tokens}'
```

## Tips

- Cache token columns are the primary cost-saving lever — if `cache_read_input_tokens` is low relative to `uncached_input_tokens`, prompt caching isn't being used effectively
- `service_tier=batch` is billed at a discount — break it out separately in reports
- For large windows, paginate: the API returns `has_more: true` and a `next_page` token when there are more buckets than the page size

Docs: https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
```

## `it-admin/skills/admin-cost/SKILL.md`

```markdown
---
name: admin-cost
description: >
  Query the Anthropic Cost Report API for organization spend. Use when the user
  asks about "our bill", "how much did we spend", "cost by workspace",
  "this month's spend", etc.
---

Endpoint family: Cost Report — dollar-denominated spend, groupable by workspace or model.

## CLI

```bash
ant admin cost-report \
  --starting-at 2025-01-01T00:00:00Z \
  --ending-at   2025-01-31T23:59:59Z \
  --group-by '["workspace_id"]' \
  --bucket-width 1d \
  --format json
```

## Response rows

Each row:
- `starting_at`, `ending_at`
- grouping key (e.g., `workspace_id`)
- `amount` — decimal string in the billing currency
- `currency` — e.g., `USD`

`amount` is a string to avoid floating-point error. Parse with care in reports.

## Reporting patterns

1. **Monthly rollup** — group by `workspace_id`, bucket `1d`, sum per workspace
2. **Anomaly detection** — fetch daily granularity, flag days >2σ above trailing 7-day average
3. **Model mix** — group by `model` to see Opus vs. Sonnet vs. Haiku share
4. **Cost per active user** — divide monthly cost by active user count from `admin-claude-code-analytics`

## Caveats

- The Cost Report is close to invoice-accurate but rounding and credit application can make it differ slightly from the final invoice
- Commitment discounts and custom pricing may not be reflected in real time
- For finance reconciliation, use the invoice PDF, not this API

Docs: https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
```

## `it-admin/skills/admin-claude-code-analytics/SKILL.md`

```markdown
---
name: admin-claude-code-analytics
description: >
  Query the Claude Code Analytics API for adoption and productivity metrics.
  Use when the user asks about "who's using Claude Code", "acceptance rate",
  "Claude Code adoption", "active developers", etc.
---

Endpoint family: Claude Code Analytics — session, suggestion, and acceptance-rate data.

## CLI

```bash
ant admin claude-code-analytics \
  --starting-at 2025-01-01T00:00:00Z \
  --ending-at   2025-01-31T23:59:59Z \
  --format json
```

Filters available on most versions:
- `--user-email <email>`
- `--workspace-id <id>`
- `--group-by day|week|user`

If `ant` on the user's version doesn't expose this command, fall back to `curl` with the `x-api-key` header — see `ant-cli-basics` for the pattern.

## Metrics returned

Typical fields:
- Active users (DAU, WAU)
- Sessions
- Tool calls by type (Read, Edit, Bash, etc.)
- Suggestions offered / accepted
- Acceptance rate
- Tokens consumed per session

## Derived metrics worth computing

- **Stickiness**: DAU / WAU — how often weekly users come back daily
- **Depth**: tool calls per session — proxy for task complexity
- **Acceptance rate by tool**: acceptance on `Edit` is the clearest productivity signal

## Privacy

This API returns per-user data. Treat it like HR data:
- Don't write per-user breakdowns to shared files without the requester's explicit consent
- Redact email addresses in exec reports unless asked otherwise
- Avoid comparative language that names individuals ("Alice accepts more than Bob")

Docs: https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api
```

## `it-admin/skills/admin-data-retention/SKILL.md`

```markdown
---
name: admin-data-retention
description: >
  Inspect and update the organization's data retention settings. Use when the
  user asks about "data retention", "how long do we keep data", "zero data
  retention", "ZDR", or "delete our history".
---

## Concepts

- **Default retention** — Anthropic retains request/response data per the org's configured policy
- **Zero Data Retention (ZDR)** — available to eligible customers; no retention beyond what's needed to serve the request
- **Regional retention** — separate policies may apply by data residency region

## CLI

Check the exact resource on the user's version with:

```bash
ant admin --help | grep -i retention
```

Likely shapes:

```bash
ant admin data-retention get --format json
ant admin data-retention update --retention-days 30
```

If not exposed in the user's `ant` version, use `curl` per the [data retention docs](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention).

## Common questions

- "Are we on ZDR?" → check the `zero_data_retention` flag
- "How long is data kept?" → check `retention_days`
- "Can we delete historical data already collected?" → retention changes apply going forward; for existing data, open a support ticket

Docs: https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention
```

## Other `it-admin/skills/` (abbreviated — same template)

- `admin-workspaces/SKILL.md` — `ant admin workspaces {list,create,update,archive}`
- `admin-workspace-members/SKILL.md` — `ant admin workspace-members {list,add,update,remove}`
- `admin-users/SKILL.md` — `ant admin users {list,update,delete}`
- `admin-invites/SKILL.md` — `ant admin invites {list,create,delete}`
- `admin-api-keys/SKILL.md` — `ant admin api-keys {list,get,update}`

Each skill body: CLI invocation + key flags, response fields, useful GJSON transforms, common uses, caveats, docs link.

## `it-admin/agents/usage-reporter.md`

```markdown
---
name: usage-reporter
description: Use this agent when the user asks for a monthly usage and cost report, a quarterly business review of Anthropic spend, or an executive summary of Claude usage.

<example>
Context: End of the month, finance wants a summary
user: "Put together our January Anthropic report"
assistant: "I'll use the usage-reporter agent to pull usage, cost, and Claude Code analytics and generate a report."
</example>

model: inherit
color: green
tools: ["Bash", "Read", "Write"]
skills: ["ant-cli-basics", "admin-usage", "admin-cost", "admin-claude-code-analytics"]
---

You are an Anthropic usage analyst. Produce a clear, executive-readable report combining Usage Report, Cost Report, and Claude Code Analytics data.

**Process**:
1. Determine the reporting period (default: previous complete month)
2. Pull usage grouped by `workspace_id` and by `model`, bucket `1d`
3. Pull cost grouped by `workspace_id`, bucket `1d`
4. Pull Claude Code analytics for the same period
5. Compute month-over-month deltas
6. Write markdown to `reports/anthropic-<YYYY-MM>.md`

**Prefer GJSON transforms over re-parsing in Bash**. Example for top 5 workspaces by cost:

```bash
ant admin cost-report --starting-at ... --ending-at ... --group-by '["workspace_id"]' \
  --format json --transform 'data|@sort:"amount"|@reverse|0:5'
```

**Report structure**:
1. Executive summary (3–5 bullets)
2. Cost overview (total, MoM, top workspaces)
3. Usage overview (tokens, requests, cache hit rate)
4. Claude Code adoption (DAU/WAU, acceptance rate, top teams)
5. Notable changes (anomalies, new workspaces, spikes)
6. Recommendations (cache underuse, tier mix, etc.)

**Caveats to always note**:
- Cost Report is near-invoice but not authoritative — finance should reconcile against the invoice PDF
- Per-user analytics are sensitive — don't include email addresses in shared reports unless the requester asked
```

## `it-admin/agents/access-auditor.md`

```markdown
---
name: access-auditor
description: Use this agent when the user asks for a security audit, access review, or compliance check of their Anthropic org.

model: inherit
color: yellow
tools: ["Bash", "Read", "Write"]
skills: ["ant-cli-basics", "admin-users", "admin-workspaces", "admin-workspace-members", "admin-api-keys"]
---

You are an access reviewer. Identify stale or over-privileged access in the org.

**Checks**:
1. **Stale users** — org members with no Claude Code activity in 60+ days
2. **Stale keys** — API keys with no requests in 90+ days (cross-check with Usage Report grouped by `api_key_id`)
3. **Orphaned keys** — keys belonging to removed users
4. **Over-privileged users** — org-admin role holders beyond the expected count; ask the user what "expected" means for their org
5. **Workspaces with no active member** — workspaces where all members have been removed or gone stale

**Output**:
- Table per check with severity, entity, and recommended action
- Summary with counts
- Draft remediation `ant` commands the user can review and run (never execute automatically)

**Never** execute destructive commands (`ant admin users delete`, `ant admin api-keys update --status revoked`, etc.) without explicit user confirmation. Print the exact command and wait for "yes".
```

## `it-admin/agents/onboarding-wizard.md`

```markdown
---
name: onboarding-wizard
description: Use this agent when the user asks to onboard a new developer, add someone to the org, or set up a new team member with Claude.

model: inherit
color: cyan
tools: ["Bash"]
skills: ["ant-cli-basics", "admin-invites", "admin-workspaces", "admin-workspace-members", "admin-api-keys"]
---

You are an onboarding assistant. Walk through adding a new user.

**Steps** (confirm each before executing):
1. Collect: email, role, target workspace(s)
2. Send invite: `ant admin invites create --email <email> --role <role>`
3. When the invite is accepted (or upfront if pre-provisioning), add to workspace(s): `ant admin workspace-members add --workspace-id <id> --user-id <id> --workspace-role <role>`
4. Offer to generate a starter API key scoped to one workspace: `ant admin api-keys create --workspace-id <id> --name "<user>-starter"`
5. Produce a welcome message with next steps the admin can forward

Never skip the confirmation before sending an invite or creating a key. Print the exact `ant` command, show what it will do, and wait for "yes".
```

---

# Release automation and pin freshness

Everything below lives at the repo root (not inside a plugin directory), because release tooling applies to all three plugins at once.

## `release-please-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "simple",
  "include-component-in-tag": true,
  "separate-pull-requests": false,
  "bump-minor-pre-major": true,
  "bump-patch-for-minor-pre-major": true,
  "changelog-sections": [
    { "type": "feat",     "section": "Features" },
    { "type": "fix",      "section": "Bug Fixes" },
    { "type": "perf",     "section": "Performance" },
    { "type": "revert",   "section": "Reverts" },
    { "type": "docs",     "section": "Documentation", "hidden": false },
    { "type": "deps",     "section": "Dependencies" },
    { "type": "chore",    "section": "Chores",        "hidden": true },
    { "type": "refactor", "section": "Refactors",     "hidden": true },
    { "type": "test",     "section": "Tests",         "hidden": true },
    { "type": "ci",       "section": "CI",            "hidden": true },
    { "type": "build",    "section": "Build",         "hidden": true },
    { "type": "style",    "section": "Style",         "hidden": true }
  ],
  "packages": {
    "data-cli": {
      "package-name": "@anthropic-ai/data-cli",
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      "extra-files": [
        { "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" }
      ]
    },
    "platform-engineering": {
      "package-name": "@anthropic-ai/platform-engineering",
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      "extra-files": [
        { "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" }
      ]
    },
    "it-admin": {
      "package-name": "@anthropic-ai/it-admin",
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      "extra-files": [
        { "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" }
      ]
    }
  },
  "plugins": [
    { "type": "linked-versions", "groupName": "knowledge-work-plugins-cli", "components": ["data-cli", "platform-engineering", "it-admin"] }
  ]
}
```

Design notes on this config:

- **`release-type: "node"`** per package — so release-please auto-bumps `package.json` versions. Even though the plugins are primarily markdown + JSON, publishing under `@anthropic-ai/` on npm is the distribution mechanism.
- **`extra-files`** — release-please also bumps the `version` field in each plugin's `.claude-plugin/plugin.json`. This is critical: the plugin manifest and the npm package must agree on version, otherwise `claude plugins add` installs a package whose manifest says an older version.
- **`separate-pull-requests: false` + `linked-versions`** — one release PR that bumps all three plugins in lockstep. This matches how `anthropics/claude-code` handles its multi-platform binaries. If you decide later that the plugins should version independently, flip both settings. My recommendation is to start linked — it forces the team to think about the suite as a whole.
- **`changelog-sections`** — `chore`, `ci`, `refactor`, `test`, `build`, `style` are all hidden. This is the same filter logic the version-check skills apply when parsing CHANGELOGs; keeping the release-please config aligned means what's in the CHANGELOG is exactly what users should care about. `docs` is deliberately **not** hidden — documentation changes affect skills and users should see them.
- **`bump-minor-pre-major`** — while the plugins are 0.x, `feat:` commits bump the minor (0.1.0 → 0.2.0). Breaking changes bump the minor too, not the major. Once any plugin hits 1.0.0, you'd remove this flag.

## `.release-please-manifest.json`

```json
{
  "data-cli": "0.1.0",
  "platform-engineering": "0.1.0",
  "it-admin": "0.1.0"
}
```

One entry per package. release-please reads this on each run to know the current version and writes back after each release. Commit this — it's source of truth.

## `.github/workflows/release-please.yml`

```yaml
name: release-please

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
          token: ${{ secrets.GITHUB_TOKEN }}

      # When a release is cut (release-please PR merged), publish to npm
      - name: Setup Node
        if: ${{ steps.release.outputs.releases_created == 'true' }}
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"

      - name: Publish data-cli to npm
        if: ${{ steps.release.outputs['data-cli--release_created'] == 'true' }}
        working-directory: data-cli
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish platform-engineering to npm
        if: ${{ steps.release.outputs['platform-engineering--release_created'] == 'true' }}
        working-directory: platform-engineering
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish it-admin to npm
        if: ${{ steps.release.outputs['it-admin--release_created'] == 'true' }}
        working-directory: it-admin
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Design notes:

- **Single workflow, two phases**. First step opens or merges the release PR. Subsequent steps — gated on `releases_created` — publish whatever actually released. release-please emits per-package outputs (`<package>--release_created`) so only packages with new versions publish.
- **`NPM_TOKEN`** must be a granular token scoped to the `@anthropic-ai` org and to publishing only. Not a classic token. Set it in repo secrets.
- **No manual tag creation**. release-please tags on merge of the release PR. Trying to tag manually will confuse it.

## `.github/workflows/pin-freshness.yml`

```yaml
name: pin-freshness

on:
  schedule:
    - cron: "0 14 * * 1"  # Mondays 14:00 UTC
  workflow_dispatch: {}

permissions:
  contents: read
  issues: write

jobs:
  check-pins:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up jq and semver
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          curl -fsSL https://raw.githubusercontent.com/fsaintjacques/semver-tool/master/src/semver -o /usr/local/bin/semver
          chmod +x /usr/local/bin/semver

      - name: Check ant pin (it-admin)
        id: ant
        run: |
          scripts/check-pin-freshness.sh it-admin/ant-pin.json > /tmp/ant-drift.json
          echo "drift=$(jq -c . /tmp/ant-drift.json)" >> "$GITHUB_OUTPUT"
          echo "status=$(jq -r .status /tmp/ant-drift.json)" >> "$GITHUB_OUTPUT"

      - name: Check claude-code pin (platform-engineering)
        id: cc
        run: |
          scripts/check-pin-freshness.sh platform-engineering/cc-pin.json > /tmp/cc-drift.json
          echo "drift=$(jq -c . /tmp/cc-drift.json)" >> "$GITHUB_OUTPUT"
          echo "status=$(jq -r .status /tmp/cc-drift.json)" >> "$GITHUB_OUTPUT"

      - name: Check duckdb pin (data-cli)
        id: duckdb
        run: |
          scripts/check-pin-freshness.sh data-cli/deps-pin.json > /tmp/duckdb-drift.json
          echo "drift=$(jq -c . /tmp/duckdb-drift.json)" >> "$GITHUB_OUTPUT"
          echo "status=$(jq -r .status /tmp/duckdb-drift.json)" >> "$GITHUB_OUTPUT"

      - name: Open or update issues for stale pins
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const pins = [
              { name: 'ant',         plugin: 'it-admin',             file: '/tmp/ant-drift.json' },
              { name: 'claude-code', plugin: 'platform-engineering', file: '/tmp/cc-drift.json' },
              { name: 'duckdb',      plugin: 'data-cli',             file: '/tmp/duckdb-drift.json' }
            ];

            for (const pin of pins) {
              const drift = JSON.parse(fs.readFileSync(pin.file, 'utf8'));
              if (drift.status === 'fresh') continue;

              const title = `[pin-drift] ${pin.name} pin in ${pin.plugin} is ${drift.status}`;
              const labels = ['pin-drift', `area/${pin.plugin}`, `severity/${drift.severity}`];

              // Deduplicate: if an open issue with this title exists, update it instead of opening a new one
              const { data: existing } = await github.rest.issues.listForRepo({
                owner: context.repo.owner,
                repo: context.repo.repo,
                state: 'open',
                labels: 'pin-drift'
              });
              const match = existing.find(i => i.title === title);

              const body = [
                `**Dependency:** \`${pin.name}\``,
                `**Plugin:** \`${pin.plugin}\``,
                `**Pinned:** \`${drift.pinned}\``,
                `**Latest upstream:** \`${drift.latest}\``,
                `**Status:** ${drift.status}`,
                '',
                '### Relevant CHANGELOG entries',
                '',
                drift.relevant_entries.length > 0
                  ? drift.relevant_entries.map(e => `- ${e}`).join('\n')
                  : '_No relevant entries matched the watch_for filter._',
                '',
                '### Action',
                '',
                '- [ ] Review the entries above',
                '- [ ] Run `/ant-version-check --fix` (or the equivalent for this plugin) locally to bump the pin',
                '- [ ] Update any skills that reference changed surface',
                '- [ ] Commit with `deps: bump ' + pin.name + ' pin to ' + drift.latest + '`',
                '',
                `_Automated by \`.github/workflows/pin-freshness.yml\`. Last checked: ${new Date().toISOString()}._`
              ].join('\n');

              if (match) {
                await github.rest.issues.update({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: match.number,
                  body
                });
              } else {
                await github.rest.issues.create({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  title,
                  body,
                  labels
                });
              }
            }
```

Design notes:

- **Weekly cadence (Mondays 14:00 UTC)** — frequent enough to catch drift within a sprint, infrequent enough that nobody tunes it out. Friday is worse because nobody wants to triage on Friday afternoon; Monday morning lets the triage happen during normal working hours.
- **Issue dedup by title** — the workflow opens *one* issue per drifted pin and updates it on subsequent runs. This prevents the "20 open issues all saying ant is stale" problem.
- **Structured body** — always the same shape, so automation and humans both know where to look.
- **Labels encode routing**: `pin-drift` for filtering, `area/<plugin>` so CODEOWNERS get notified, `severity/<level>` so triage can pick "all severity/high" in one glance.
- **`workflow_dispatch`** — you can run this on demand from the Actions tab without waiting for Monday.

## `scripts/check-pin-freshness.sh`

```bash
#!/usr/bin/env bash
# Check a single pin file for drift against its upstream CHANGELOG.
# Usage: scripts/check-pin-freshness.sh <path/to/*-pin.json>
# Output: JSON to stdout with status, pinned, latest, and relevant CHANGELOG entries.
# Exit code: 0 if fresh, 1 if drifted, 2 if error.

set -euo pipefail

PIN_FILE="${1:?pin file path required}"
[[ -f "$PIN_FILE" ]] || { echo "pin file not found: $PIN_FILE" >&2; exit 2; }

# shellcheck source=lib/parse-changelog.sh
source "$(dirname "$0")/lib/parse-changelog.sh"

# Normalize: some pins have a single pinned_version (ant, cc),
# others have a nested dependencies object (duckdb deps-pin.json).
# This script handles the "single pin" shape; deps-pin.json is checked
# per-dependency by a wrapper that calls this in a loop.
if jq -e '.pinned_version' "$PIN_FILE" > /dev/null 2>&1; then
  PINNED=$(jq -r '.pinned_version' "$PIN_FILE")
  CHANGELOG_URL=$(jq -r '.changelog_url // empty' "$PIN_FILE")
  WATCH_FOR=$(jq -r '.watch_for[]? // empty' "$PIN_FILE")
elif jq -e '.claude_code.pinned_version' "$PIN_FILE" > /dev/null 2>&1; then
  PINNED=$(jq -r '.claude_code.pinned_version' "$PIN_FILE")
  CHANGELOG_URL=$(jq -r '.claude_code.changelog_sources[0]' "$PIN_FILE")
  WATCH_FOR=$(jq -r '.watch_for[]? // empty' "$PIN_FILE")
elif jq -e '.dependencies.duckdb.pinned_version' "$PIN_FILE" > /dev/null 2>&1; then
  PINNED=$(jq -r '.dependencies.duckdb.pinned_version' "$PIN_FILE")
  CHANGELOG_URL=$(jq -r '.dependencies.duckdb.changelog_url' "$PIN_FILE")
  WATCH_FOR=$(jq -r '.dependencies.duckdb.watch_for[]? // empty' "$PIN_FILE")
else
  echo '{"status":"error","reason":"unknown pin shape"}' ; exit 2
fi

if [[ -z "$CHANGELOG_URL" ]]; then
  echo '{"status":"error","reason":"no changelog_url in pin"}' ; exit 2
fi

# Fetch upstream CHANGELOG. Allow curl failure; fall back to "status: unknown".
TMP_CL=$(mktemp)
trap 'rm -f "$TMP_CL"' EXIT
if ! curl -fsSL "$CHANGELOG_URL" -o "$TMP_CL"; then
  jq -n --arg pinned "$PINNED" --arg url "$CHANGELOG_URL" \
    '{status:"error",reason:"changelog fetch failed",pinned:$pinned,url:$url}'
  exit 2
fi

# Extract the latest version from the CHANGELOG (release-please format: ## X.Y.Z (date))
LATEST=$(parse_changelog_latest_version "$TMP_CL")
[[ -z "$LATEST" ]] && { echo '{"status":"error","reason":"could not parse latest version"}'; exit 2; }

# Compare
if [[ "$PINNED" == "$LATEST" ]]; then
  jq -n --arg pinned "$PINNED" --arg latest "$LATEST" \
    '{status:"fresh",pinned:$pinned,latest:$latest,severity:"none",relevant_entries:[]}'
  exit 0
fi

# Determine ahead/behind using semver comparison
CMP=$(printf '%s\n%s\n' "$PINNED" "$LATEST" | sort -V | head -1)
if [[ "$CMP" == "$LATEST" ]]; then
  # Pinned is newer than what we fetched (unusual — maybe the CHANGELOG lags the release)
  STATUS="pinned-ahead"
  SEVERITY="low"
else
  STATUS="drifted"
  # Severity heuristic: major bump = high, minor = medium, patch = low
  PINNED_MAJOR=$(echo "$PINNED" | cut -d. -f1)
  LATEST_MAJOR=$(echo "$LATEST" | cut -d. -f1)
  PINNED_MINOR=$(echo "$PINNED" | cut -d. -f2)
  LATEST_MINOR=$(echo "$LATEST" | cut -d. -f2)
  if [[ "$PINNED_MAJOR" != "$LATEST_MAJOR" ]]; then SEVERITY="high"
  elif [[ "$PINNED_MINOR" != "$LATEST_MINOR" ]]; then SEVERITY="medium"
  else SEVERITY="low"
  fi
fi

# Extract relevant CHANGELOG entries between pinned and latest
RELEVANT_ENTRIES_JSON=$(parse_changelog_relevant_entries "$TMP_CL" "$PINNED" "$LATEST" "$WATCH_FOR")

jq -n \
  --arg status "$STATUS" \
  --arg pinned "$PINNED" \
  --arg latest "$LATEST" \
  --arg severity "$SEVERITY" \
  --argjson entries "$RELEVANT_ENTRIES_JSON" \
  '{status:$status,pinned:$pinned,latest:$latest,severity:$severity,relevant_entries:$entries}'

[[ "$STATUS" == "fresh" ]] && exit 0 || exit 1
```

Design notes:

- **Handles three pin shapes** — flat (ant), nested under `claude_code` (cc-pin), and nested under `dependencies.duckdb` (deps-pin). The if/elif chain keeps the script simple rather than introducing a JSON schema. When you add a fourth pin, add another branch.
- **Fail-safe on fetch errors** — a 500 from GitHub's raw shouldn't cause the weekly check to spam issues. The script returns `status:"error"` and the workflow can decide whether to open an issue on that.
- **Severity heuristic** — major bump → high, minor → medium, patch → low. This is approximate (a "patch" can include breaking changes in 0.x), but it's good enough for issue prioritization.
- **Exits 0/1/2** — 0 = fresh, 1 = drifted, 2 = error. The workflow uses this to decide whether to post an issue.

## `scripts/lib/parse-changelog.sh`

```bash
#!/usr/bin/env bash
# Shared CHANGELOG parsing helpers for release-please-formatted CHANGELOG.md files.
# Sourced by check-pin-freshness.sh and by CI smoke tests.

# parse_changelog_latest_version <changelog_file>
# Prints the latest version number (from the first "## X.Y.Z" heading).
parse_changelog_latest_version() {
  local file="$1"
  grep -E '^## [0-9]+\.[0-9]+\.[0-9]+' "$file" | head -1 \
    | sed -E 's/^## ([0-9]+\.[0-9]+\.[0-9]+).*/\1/'
}

# parse_changelog_relevant_entries <changelog_file> <from_version> <to_version> <watch_for_newline_separated>
# Prints a JSON array of relevant bullet strings from entries strictly newer than <from_version>
# up to and including <to_version>.
#
# Filtering rules (matches the version-check skills):
#   Keep bullet if it's under ### Features, ### Bug Fixes, or ### BREAKING CHANGES
#   Keep bullet if it contains any string in watch_for (case-insensitive substring)
#   Drop bullet if it's under ### Chores, ### CI, ### Build, ### Style, ### Refactor, ### Tests
#   Drop bullet if it matches: ^[*-] [a-f0-9]{7,}$  (just a commit hash)
#   Drop bullet if it matches: chore\(internal\):|codegen|sync repo
parse_changelog_relevant_entries() {
  local file="$1" from="$2" to="$3" watch_for_raw="$4"
  local in_range=0 current_section="" result="[]"

  # Build a grep alternation from watch_for (newline-separated)
  local watch_pattern=""
  if [[ -n "$watch_for_raw" ]]; then
    watch_pattern=$(echo "$watch_for_raw" | tr '\n' '|' | sed 's/|$//')
  fi

  while IFS= read -r line; do
    # Detect version heading: ## X.Y.Z (date)
    if [[ "$line" =~ ^##[[:space:]]+([0-9]+\.[0-9]+\.[0-9]+) ]]; then
      local v="${BASH_REMATCH[1]}"
      # Are we in the range (from, to]?
      local after_from=$(printf '%s\n%s\n' "$from" "$v" | sort -V | tail -1)
      local at_or_before_to=$(printf '%s\n%s\n' "$v" "$to" | sort -V | tail -1)
      if [[ "$after_from" == "$v" && "$v" != "$from" && "$at_or_before_to" == "$to" ]]; then
        in_range=1
      else
        in_range=0
      fi
      current_section=""
      continue
    fi

    [[ "$in_range" -eq 1 ]] || continue

    # Detect section heading: ### Features
    if [[ "$line" =~ ^###[[:space:]]+(.+)$ ]]; then
      current_section="${BASH_REMATCH[1]}"
      continue
    fi

    # Only process bullet lines
    [[ "$line" =~ ^[*-][[:space:]]+ ]] || continue

    # Strip the bullet marker for matching
    local content="${line#[*-] }"

    # Drop noise patterns
    [[ "$content" =~ ^[a-f0-9]{7,}$ ]] && continue
    [[ "$content" =~ chore\(internal\)|codegen|sync\ repo ]] && continue

    # Drop by section
    case "$current_section" in
      Chores|CI|Build|Style|Refactors|Tests) continue ;;
    esac

    # Keep by section or by watch_for
    local keep=0
    case "$current_section" in
      Features|"Bug Fixes"|"BREAKING CHANGES"|Performance|Dependencies) keep=1 ;;
    esac
    if [[ "$keep" -eq 0 && -n "$watch_pattern" ]]; then
      if echo "$content" | grep -qiE "$watch_pattern"; then
        keep=1
      fi
    fi

    if [[ "$keep" -eq 1 ]]; then
      result=$(echo "$result" | jq --arg e "$content" '. + [$e]')
    fi
  done < "$file"

  echo "$result"
}
```

Design notes:

- **Pure bash + jq**. No Python, no Node. Runs on the default GitHub Actions `ubuntu-latest` image without extra setup. Fewer moving parts = fewer things to break at 3 AM on a Monday.
- **Version-range filter (`from, to]`** — bullets from the pinned version are excluded (the user already saw them when they pinned), bullets up to and including the latest are included.
- **Filter logic matches the version-check skills exactly**. This is deliberate. The CI-side drift report and the interactive `/ant-version-check` report produce the same filtered set. When Anthropic's docs team changes what they hide, you update this file and the skills' `watch_for` arrays, and both surfaces stay consistent.
- **`jq` for JSON output** — avoids the classic bash "quote escaping in generated JSON" bug. Always build JSON with `jq --arg`, never with string concatenation.

## `.github/ISSUE_TEMPLATE/pin-update.yml`

```yaml
name: Pin update
description: Report or track a drifted version pin in a plugin
title: "[pin-drift] <dependency> pin in <plugin> is drifted"
labels: ["pin-drift"]
body:
  - type: markdown
    attributes:
      value: |
        Use this template when a plugin's pinned dependency version has drifted from upstream and needs review.
        The weekly `pin-freshness` workflow opens these automatically. Humans can also open them manually.

  - type: dropdown
    id: plugin
    attributes:
      label: Plugin
      options:
        - data-cli
        - platform-engineering
        - it-admin
    validations:
      required: true

  - type: input
    id: dependency
    attributes:
      label: Dependency
      description: e.g., ant, claude-code, duckdb, python-plotext
      placeholder: ant
    validations:
      required: true

  - type: input
    id: pinned
    attributes:
      label: Currently pinned version
      placeholder: 1.2.1
    validations:
      required: true

  - type: input
    id: latest
    attributes:
      label: Latest upstream version
      placeholder: 1.3.0
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - high (major bump or breaking change)
        - medium (minor bump with new features)
        - low (patch bump, bug fixes)
    validations:
      required: true

  - type: textarea
    id: relevant-entries
    attributes:
      label: Relevant CHANGELOG entries
      description: Bullets from the upstream CHANGELOG that affect this plugin's skills
      render: markdown

  - type: textarea
    id: impact
    attributes:
      label: Impact on skills/commands
      description: Which skills or commands reference the drifted surface? Which need updating?
      placeholder: |
        - skills/admin-usage/SKILL.md references `ant admin usage-report messages` (check for rename)
        - commands/usage.md uses `--group-by workspace_id` flag (check if renamed)

  - type: checkboxes
    id: tasks
    attributes:
      label: Tasks
      options:
        - label: Reviewed upstream CHANGELOG
        - label: Ran plugin's version-check command locally
        - label: Updated any affected skills
        - label: Bumped pin and `surface_freshness.last_verified` if applicable
        - label: Added CHANGELOG entry in this repo with `deps:` prefix
```

## How the pieces fit together

End-to-end flow of a pin drift:

1. Monday 14:00 UTC — `pin-freshness.yml` runs
2. Each pin file is checked by `scripts/check-pin-freshness.sh`
3. Script fetches the upstream CHANGELOG and parses via `scripts/lib/parse-changelog.sh`
4. If drift is detected, script emits JSON describing what changed
5. Workflow opens or updates an issue using the `pin-update.yml` template
6. Issue gets labeled `pin-drift`, `area/<plugin>`, `severity/<level>`
7. CODEOWNERS for that plugin directory get auto-assigned
8. Human runs `/ant-version-check --fix` (or equivalent) locally, reviews surface changes
9. Human opens a PR with `deps(ant): bump pin to 1.3.0`
10. PR merges; release-please opens a release PR bumping the plugin's minor version
11. Release PR merges; release-please tags, publishes to npm under `@anthropic-ai/`
12. Next Monday's `pin-freshness.yml` closes the now-stale issue automatically (because the pin matches upstream again)

The commit-type conventions that thread through all of this:

| Commit prefix                    | Effect                                              |
|----------------------------------|-----------------------------------------------------|
| `feat(data-cli): add /profile-schema` | Minor bump on data-cli; shows as "Features"    |
| `fix(it-admin): correct ant flag name` | Patch bump; shows as "Bug Fixes"              |
| `deps(data-cli): bump duckdb pin to 1.2.0` | Patch bump; shows as "Dependencies"        |
| `docs(platform-engineering): clarify SKILL.md writing rules` | Patch bump; shows as "Documentation" |
| `feat!(it-admin): rename /rotate-key to /cycle-key` | Major-or-minor bump (depending on pre-1.0 setting); shows as "BREAKING CHANGES" |
| `chore(ci): update Node version` | No release; hidden                                 |

Scope in parens tells release-please which package to bump. Without a scope, the commit is treated as affecting all linked packages — useful for repo-wide changes but rarely what you want. Teach contributors to always scope.

## What's missing that's still worth adding later

The three files above are the nontrivial automation. Still useful but straightforward enough to write when you need them:

- **`commitlint.config.js` + `.husky/commit-msg`** — enforces Conventional Commits at commit time. Matches the `release-please` config's `changelog-sections`.
- **`.github/workflows/lint-pr.yml` using `amannn/action-semantic-pull-request`** — enforces the same on PR titles, in case contributors squash-merge.
- **`.github/workflows/test.yml`** — the plugin validation CI. One-liner per plugin: `claude plugin validate <plugin>/.claude-plugin/plugin.json`, then run `scripts/lib/parse-changelog.sh` smoke tests, then run `/stack-check --json` in a pinned container and assert exit 0.
- **`scripts/new-plugin.sh`** — scaffolds a new plugin in this monorepo, including a stub pin file, a `package.json`, and registration in `release-please-config.json` + `.release-please-manifest.json`.

---

**Updated todo**

- [x] 1. `release-please-config.json` — three-package monorepo config with linked versions
- [x] 2. `.release-please-manifest.json` — starting versions
- [x] 3. `.github/workflows/release-please.yml` — the workflow that opens release PRs
- [x] 4. `.github/workflows/pin-freshness.yml` — weekly pin drift check that opens issues
- [x] 5. `scripts/check-pin-freshness.sh` — the actual drift detection logic
- [x] 6. `scripts/lib/parse-changelog.sh` — shared CHANGELOG parsing (release-please format)
- [x] 7. `.github/ISSUE_TEMPLATE/pin-update.yml` — structured issue form the workflow posts to
- [x] 8. Brief integration notes — how the pieces fit together

## `knowledge-work-plugins-cli/README.md`

```markdown
# knowledge-work-plugins-cli

Official Claude Code plugins from Anthropic. Parallels the Cowork `knowledge-work-plugins` repo but tuned for the CLI (terminal, Claude Code on the web, Remote Control).

| Plugin                  | For                                | Equivalent Cowork plugin          |
|-------------------------|------------------------------------|-----------------------------------|
| `data-cli`              | Data analysts in the terminal      | `data`                            |
| `platform-engineering`  | Platform engineers managing plugins | `cowork-plugin-management`        |
| `it-admin`              | IT administrators                  | (new — no Cowork equivalent yet)  |

## Installation

```bash
claude plugins add knowledge-work-plugins-cli/data-cli
claude plugins add knowledge-work-plugins-cli/platform-engineering
claude plugins add knowledge-work-plugins-cli/it-admin
```

## Philosophy

- **Skills are instructions for Claude**, not docs for humans. Imperative voice.
- **Progressive disclosure**: keep `SKILL.md` bodies under ~3000 words; push detail into `references/`.
- **Terminal-first output**: plain text, piped-friendly JSON, ASCII charts. No HTML dashboards.
- **Use `${CLAUDE_PLUGIN_ROOT}`** for all intra-plugin paths.
- **Subagents obey Claude Code's scope precedence**: managed > project > user > plugin > CLI-ephemeral. Plugin subagents can't use `hooks`, `mcpServers`, or `permissionMode`.
- **Every external dependency is pinned.** `ant` in `it-admin`, DuckDB in `data-cli`, Claude Code itself in `platform-engineering`. Version drift is caught by `/stack-check` before it becomes a bug report.
```

## `knowledge-work-plugins-cli/stack-check/` (shared by all plugins)

`/stack-check` is a command exposed by `platform-engineering` that reads every pin file in the installed plugin suite and produces a unified status report. It's the single pane of glass for "is my Claude Code stack aligned?"

## `platform-engineering/commands/stack-check.md`

```markdown
---
description: Run all version checks across installed Anthropic plugins and produce a unified status
allowed-tools: Bash(claude:*), Bash(ant:*), Bash(duckdb:*), Bash(sqlite3:*), Bash(psql:*), Bash(python:*), Bash(curl:*), Bash(jq:*), Bash(ls:*), Read, Glob
argument-hint: "[--fix] [--surface] [--json] [--verbose]"
---

Args: `$ARGUMENTS`

## Step 1: Discover installed plugins

Enumerate pin files across installed plugins:

```bash
# Common plugin installation roots
for root in ~/.claude/plugins ./plugins /usr/local/share/claude/plugins; do
  [ -d "$root" ] || continue
  for plugin_dir in "$root"/*/; do
    [ -f "$plugin_dir/.claude-plugin/plugin.json" ] || continue
    plugin_name=$(jq -r .name "$plugin_dir/.claude-plugin/plugin.json")
    for pin in "$plugin_dir"/*-pin.json "$plugin_dir/cc-pin.json" "$plugin_dir/deps-pin.json" "$plugin_dir/ant-pin.json"; do
      [ -f "$pin" ] && echo "$plugin_name|$pin"
    done
  done
done
```

This picks up any pin file a plugin chose to publish. New plugins just drop a pin at their root and `/stack-check` finds them.

## Step 2: For each pin, run its check

Don't duplicate logic. Each plugin already ships its own version-check command (`/cc-version-check`, `/ant-version-check`, `/deps-check`). `/stack-check` delegates to each one and collects results.

For each plugin in discovery:

| Plugin                  | Check to run         | Expected output format                       |
|-------------------------|----------------------|----------------------------------------------|
| `platform-engineering`  | `/cc-version-check --json`  | JSON with `{ok, installed, pinned, drift}` |
| `it-admin`              | `/ant-version-check --json` | same                                         |
| `data-cli`              | `/deps-check --json`        | same                                         |

When `--json` is passed to `/stack-check`, invoke each subcommand with `--json` too. Otherwise, invoke them normally and parse their text output.

If a plugin doesn't have a JSON mode, fall back to parsing the text report. The loose contract is: the first line of the report says `✓` (ok), `warning`, or `error`, followed by "installed X, pinned Y".

## Step 3: Unified report

Default text output:

```
Claude Code stack status
────────────────────────
claude-code            2.0.0   ✓ pinned 2.0.0, surface verified 2026-04-22
ant                    1.2.1   ✓ pinned 1.2.1
duckdb                 1.1.3   ✓ pinned 1.1.3
sqlite3                3.45.0  ✓ pinned 3.45.0
psql                   16.2    ✓ pinned 16
python duckdb          1.1.3   ✓ pinned 1.1.3
python plotext         5.3.2   ✓ pinned 5.3.2

All pins verified. Safe to use data-cli, it-admin, platform-engineering commands.
```

When something is off:

```
Claude Code stack status
────────────────────────
claude-code            2.1.0   ⚠ pinned 2.0.0 — ahead by 1 release
                                 New: resourceUrls field in plugin.json, SubagentStart hook event
ant                    1.2.1   ✓ pinned 1.2.1
duckdb                 1.0.0   ⚠ pinned 1.1.3 — 1 minor behind, sql-queries skill may reference newer functions
sqlite3                —       ○ not installed (optional)
python plotext         4.2.0   ✗ pinned 5.3.2, below minimum 5.0.0
                                 Fix: pip install --upgrade 'plotext>=5.0.0'

2 warnings, 1 error. Run /stack-check --fix to apply safe fixes, or address each plugin's
check individually for interactive handling.
```

## Step 4: --fix behavior

`--fix` in `/stack-check` is conservative. It only auto-applies fixes that were already auto-safe in each plugin's own check:

- `data-cli`: `pip install --user` for Python packages (never system binaries)
- `it-admin`: never (admin operations are too sensitive to auto-touch)
- `platform-engineering`: never (pin bumps require human review of the authoring surface)

For anything that needs judgment, print the exact command the user should run in that plugin's own check (e.g., `/cc-version-check --fix`). Don't pretend `/stack-check --fix` is a superset of per-plugin fixes — it's explicitly *less*.

## Step 5: --json output

When `--json` is passed, emit machine-readable status for CI integration:

```json
{
  "ok": false,
  "checked_at": "2026-04-22T18:42:00Z",
  "plugins": [
    {
      "name": "platform-engineering",
      "status": "warning",
      "dependency": "claude-code",
      "installed": "2.1.0",
      "pinned": "2.0.0",
      "drift_type": "ahead",
      "relevant_changes": [
        "Added resourceUrls field to plugin.json",
        "New hook event SubagentStart"
      ]
    },
    {
      "name": "data-cli",
      "status": "error",
      "dependency": "python plotext",
      "installed": "4.2.0",
      "pinned": "5.3.2",
      "minimum": "5.0.0",
      "drift_type": "below-minimum",
      "fix_command": "pip install --upgrade 'plotext>=5.0.0'",
      "auto_fixable": true
    }
  ],
  "summary": { "ok": 5, "warnings": 1, "errors": 1, "missing_optional": 1 }
}
```

Exit codes:
- `0` — everything ok
- `1` — warnings only
- `2` — one or more errors (below minimum, missing required dep)

This makes `/stack-check --json` drop-in usable in CI: a preflight step before running agent workloads.

## Step 6: --surface behavior

Pass-through to each plugin's own surface check. For `platform-engineering`, this runs the live `claude --agents '{}' --help` diff against `authoring_surface`. Other plugins ignore this flag.

## Step 7: Empty-stack handling

If `/stack-check` finds no pin files (no installed plugins, or plugins without pins), print:

```
No Anthropic plugins with version pins detected. Install at least one:
  claude plugins add knowledge-work-plugins-cli/data-cli
  claude plugins add knowledge-work-plugins-cli/it-admin
  claude plugins add knowledge-work-plugins-cli/platform-engineering
```

Don't pretend everything's fine — an empty stack is a state worth surfacing.

## Integration with SessionStart

The existing SessionStart hooks in each plugin run their own version checks on first use. `/stack-check` is the human-invoked version: before starting a big session, before a CI run, after upgrading any tool.

If the user wants `/stack-check` to run automatically at SessionStart, they can add this to their `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "type": "command", "command": "claude-stack-check --json --quiet", "timeout": 15 }
    ]
  }
}
```

But don't make this the default. Version checks on every session are noisy. Once per machine-day is the right cadence, which is the job of each plugin's individual hook.
```
