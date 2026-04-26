# Migration plan: Cowork plugins → CLI plugins

Port all 14 Cowork plugins to CLI variants under `knowledge-work-plugins-cli/`. Each port is one GitHub Milestone. Each Milestone has a canonical acceptance test suite that either passes or fails — no "mostly done." The PM plugins we already designed coordinate the work, so we dogfood from day one.

---

## 1. Plugin classification by port complexity

Not all 14 plugins are equal. Some are near-mechanical ports (swap MCPs, trim HTML UI); others are fundamental redesigns (the plugin assumes Cowork affordances that don't exist in a CLI). Classifying up front drives the sequence in §6.

**Tier 1 — Near-mechanical port (2-3 days each)**
These plugins are mostly markdown skills and slash commands. The port work is: swap `~~` placeholders for CLI-friendly defaults, drop any HTML dashboards, re-verify MCP servers work through `claude mcp`, and pass the acceptance tests.

- `legal-cli` — playbook-driven contract review; pure markdown + MCPs
- `finance-cli` — close/reconciliation workflows; pure markdown + data warehouse MCPs
- `marketing-cli` — content drafting; needs brand voice file swapped for local settings
- `operations-cli` — process docs, runbooks; pure markdown
- `human-resources-cli` — offer letters, onboarding; pure markdown + HRIS MCPs
- `customer-support-cli` — ticket triage, escalations; pure markdown + support MCPs
- `sales-cli` — call prep, outreach; pure markdown + CRM MCPs

**Tier 2 — Redesign required (4-7 days each)**
These plugins have UI surfaces (HTML dashboards, visual renderers) or assume browser-native affordances. Porting means deciding what replaces the UI.

- `productivity-cli` — replace `dashboard.html` with `claude-productivity status` TUI (already decided: hybrid with GitHub Projects as team dashboard)
- `product-management-cli` — all coordination moves to GitHub Projects via the shared schema (already decided)
- `design-cli` — replaces `/critique` visual feedback with structured markdown critique; Figma MCP still works
- `engineering-cli` — `/standup` needs a new data-gathering pattern (pull from git + issues instead of Cowork's activity scan)
- `enterprise-search-cli` — the cross-tool search pattern works fine in CLI, but digest output needs a new rendering target

**Tier 3 — Fundamental rethink (7-14 days each)**
These plugins have deep CLI-hostile assumptions that need a different architecture entirely.

- `pdf-viewer-cli` — the Cowork version is a *live interactive viewer*. In a CLI, the equivalent is: open the PDF in `$PAGER` or the user's default viewer, extract annotations as sidecar JSON, reconcile on save. Different product, same intent. Worth deferring until last.

**Plus the two plugins we've already designed:**
- `data-cli` — scaffold exists, needs to complete
- `platform-engineering` and `it-admin` — new plugins, not ports

Total: 14 ports + 2 new = 16 milestones. Realistic timeline at a reasonable cadence: 3-4 months for Tier 1+2, Tier 3 and polish another 1-2 months.

---

## 2. Deterministic acceptance criteria: what "migrated" means

Every milestone closes when a specific test suite passes. The suite is the same shape for every plugin, so contributors know what's expected, and CI runs the same harness regardless of which plugin you're working on.

A plugin is "migrated" when **all eight of these tests pass** in CI:

### Test 1: Manifest validity
`claude plugin validate <plugin>/.claude-plugin/plugin.json` exits 0. Catches missing fields, invalid JSON, wrong name casing.

### Test 2: Skill frontmatter conforms
Every `SKILL.md` has valid YAML frontmatter with `name` and `description` fields. `name` matches the parent directory. Description is third-person with at least two trigger phrases in quotes (this is the Anthropic style guide for skills).

Implemented as:
```bash
python3 scripts/lint-skill-frontmatter.py <plugin>/skills/
```

### Test 3: Command frontmatter conforms
Every `commands/*.md` file has `description` and, if it accepts arguments, `argument-hint`. `allowed-tools` is present (not the same as empty — an explicit list, even if broad). This forces every command author to think about the tool surface.

### Test 4: MCP config parses and reaches upstream
`.mcp.json` is valid JSON. For every HTTP server entry with a non-empty `url`, a `curl -sSI` returns a 2xx/3xx response (401 is fine — means the server is alive and just wants auth). This catches MCP URL rot before a user hits it.

### Test 5: Skills fire on trigger phrases
For each skill, the test harness launches Claude Code headlessly with one of the trigger phrases from the skill's `description`, and verifies the skill was loaded (Claude Code logs which skills activated). Either the skill fires or it doesn't — deterministic.

Implemented as:
```bash
scripts/test-skill-triggers.sh <plugin>
```

This is the big test. It's what separates "we shipped a plugin" from "the plugin actually works."

### Test 6: Commands run to completion on canonical fixtures
Each plugin ships a `fixtures/` directory with realistic inputs. For each slash command, the test invokes it against a fixture and verifies the output is well-formed (not empty, not an error, conforms to the expected shape).

Example for `write-spec`:
```bash
echo "Add SSO support for enterprise customers" \
  | claude --agent product-management-cli /write-spec \
  > /tmp/output.md
python3 scripts/validate-spec-output.py /tmp/output.md
# checks: has ## Problem, ## Goals, ## Non-Goals, ## User Stories, ## Requirements sections
```

The validator is deterministic — it either finds the required sections or doesn't.

### Test 7: GraphQL round-trip (if plugin writes to GitHub)
For plugins that write to GitHub (productivity-cli, product-management-cli, platform-engineering), a test creates a test Issue via the plugin's command, queries it back via the schema library, and verifies every field the plugin set.

Example:
```bash
source packages/schema/lib/graphql-client.sh
issue_url=$(claude /task-add "test task" --area productivity-cli --priority P2 2>&1 | grep -oE 'https://[^ ]+')
issue_number=$(echo "$issue_url" | grep -oE '[0-9]+$')
result=$(kwpc_graphql task "{\"number\":$issue_number}")
test "$(echo "$result" | jq -r '.data.task.priority')" = "P2" || exit 1
```

### Test 8: Documentation completeness
Every plugin has: `README.md` with install + command reference, `CONNECTORS.md` if it uses `~~` placeholders, `CHANGELOG.md` with at least a `[0.1.0]` entry. Enforced by a `scripts/docs-complete.sh <plugin>` checker.

### Composite exit code
A plugin's CI workflow runs all eight tests and exits 0 only if all eight pass. That exit code is the single signal GitHub Actions uses to close the Milestone's required checks.

---

## 3. GitHub Milestone + Issue + Project structure

One Milestone per plugin. Milestones are native GitHub — they have a name, a due date, and a percentage-complete tracker. Issues get assigned to milestones. Closing all the Issues in a Milestone closes the Milestone.

### Milestone naming

```
Plugin: <plugin-name>-cli
```

Twelve milestones at launch. Example titles:

- `Plugin: legal-cli`
- `Plugin: finance-cli`
- `Plugin: productivity-cli`
- …

The one-Milestone-per-plugin pattern means `GET /repos/:owner/:repo/milestones/:number` gives you everything about that port's progress in a single API call. This is why Milestones — not labels or projects — are the primary grouping.

### Issues per milestone

Every plugin port is decomposed into exactly 8 Issues, one per acceptance test. Standard template:

```
#1 [legal-cli] T1: manifest validity
#2 [legal-cli] T2: skill frontmatter lints clean
#3 [legal-cli] T3: command frontmatter lints clean
#4 [legal-cli] T4: MCP config reachable
#5 [legal-cli] T5: skills fire on trigger phrases
#6 [legal-cli] T6: commands complete on fixtures
#7 [legal-cli] T7: GraphQL round-trip (N/A if plugin doesn't write)
#8 [legal-cli] T8: docs complete
```

Each Issue has:
- Milestone: `Plugin: legal-cli`
- Labels: `area/legal-cli`, `migration`, `acceptance-test`, `test/<n>`
- Project: `kwpc-migration`
- Status field in project: BACKLOG / IN_PROGRESS / IN_REVIEW / DONE

The body is a short checklist: what the test verifies, how to run it locally, the CI job that runs it.

### Plus a parent tracking Issue

One extra Issue per Milestone, labeled `tracking`. Its body is the 8 checkboxes for the 8 test Issues. This is what you link to in Slack, in stakeholder updates, and in the README's progress table. When GitHub auto-checks a box because a linked Issue closed, the tracking Issue updates in real time.

```markdown
# [legal-cli] Migration tracker

Progress: 0/8 tests passing

- [ ] T1: manifest validity (#142)
- [ ] T2: skill frontmatter lints clean (#143)
- [ ] T3: command frontmatter lints clean (#144)
- [ ] T4: MCP config reachable (#145)
- [ ] T5: skills fire on trigger phrases (#146)
- [ ] T6: commands complete on fixtures (#147)
- [ ] T7: GraphQL round-trip (N/A)
- [ ] T8: docs complete (#148)

Closes Milestone: Plugin: legal-cli
```

### Project V2 fields

The `kwpc-migration` project has these single-select fields so the board is filterable:

| Field name    | Options                                                             |
|---------------|---------------------------------------------------------------------|
| `Status`      | BACKLOG / IN_PROGRESS / IN_REVIEW / BLOCKED / DONE                  |
| `Tier`        | T1 / T2 / T3 (from §1)                                              |
| `Plugin`      | one per plugin — `legal-cli`, `finance-cli`, etc.                   |
| `Test`        | T1-T8 (matches the acceptance tests)                                |
| `Sprint`      | iteration (built-in GitHub Projects field)                          |

Filter by `Plugin: productivity-cli AND Status != DONE` and you see exactly the remaining work on that port. Filter by `Tier: T1 AND Status = BACKLOG` and you see your next-up pile.

---

## 4. GraphQL bootstrap: create all milestones at once

Manual Milestone creation is tedious and error-prone. The schema library gets a `bootstrapMigrationMilestones` mutation that takes a list of plugin names and creates everything: Milestones, tracking Issues, test Issues, project items.

### `packages/schema/graphql/queries/bootstrapMigrationMilestones.graphql`

```graphql
# Single mutation that creates one milestone with its 8 test issues + tracking issue.
# Called once per plugin in the bootstrap script — GitHub's GraphQL doesn't support
# true batching across distinct object types, so we loop but each loop is one RTT.

mutation bootstrapPluginMigration(
  $repoId: ID!
  $projectId: ID!
  $pluginName: String!
  $dueDate: DateTime!
  $tier: String!
) {
  milestone: createMilestone(input: {
    repositoryId: $repoId
    title: "Plugin: <pluginName>-cli"   # resolver substitutes
    description: "Migration of the Cowork <pluginName> plugin to CLI. Closes when 8 acceptance tests pass."
    dueOn: $dueDate
  }) { milestone { id number } }

  # The 8 test issues are created client-side in a follow-up loop.
  # Reason: GraphQL doesn't allow true fan-out in a single mutation without
  # a custom server-side resolver, which we don't have. The bootstrap script
  # below does the loop in bash.
}
```

### `scripts/bootstrap-migration.sh`

```bash
#!/usr/bin/env bash
# One-shot setup of all 12 migration milestones.
# Idempotent: skips milestones that already exist.

set -euo pipefail
source packages/schema/lib/graphql-client.sh

PLUGINS=(
  "legal:T1:2026-06-01"
  "finance:T1:2026-06-08"
  "marketing:T1:2026-06-15"
  "operations:T1:2026-06-22"
  "human-resources:T1:2026-06-29"
  "customer-support:T1:2026-07-06"
  "sales:T1:2026-07-13"
  "productivity:T2:2026-07-27"
  "product-management:T2:2026-08-10"
  "design:T2:2026-08-24"
  "engineering:T2:2026-09-07"
  "enterprise-search:T2:2026-09-21"
  "data:T2:2026-10-05"          # completes the existing scaffold
  "pdf-viewer:T3:2026-10-26"    # last, hardest
)

REPO_ID=$(kwpc_graphql_data getRepoId "{\"owner\":\"$KWPC_REPO_OWNER\",\"name\":\"$KWPC_REPO_NAME\"}" | jq -r '.repository.id')
PROJECT_ID=$(kwpc_project_id)

for entry in "${PLUGINS[@]}"; do
  IFS=':' read -r plugin tier due <<< "$entry"
  plugin_name="${plugin}-cli"

  # Skip if milestone exists
  existing=$(kwpc_graphql_data findMilestone "{\"owner\":\"$KWPC_REPO_OWNER\",\"name\":\"$KWPC_REPO_NAME\",\"title\":\"Plugin: $plugin_name\"}" | jq -r '.repository.milestones.nodes[0].number // empty')
  if [[ -n "$existing" ]]; then
    echo "Skipping $plugin_name — milestone #$existing already exists"
    continue
  fi

  echo "Bootstrapping $plugin_name (Tier $tier, due $due)"
  
  # 1. Create milestone
  milestone_number=$(kwpc_graphql_data createMilestone "$(jq -cn \
    --arg repoId "$REPO_ID" \
    --arg title  "Plugin: $plugin_name" \
    --arg due    "${due}T17:00:00Z" \
    --arg tier   "$tier" \
    '{repoId:$repoId, title:$title, dueDate:$due, tier:$tier}')" \
    | jq -r '.createMilestone.milestone.number')

  # 2. Create 8 acceptance test issues
  for test_num in 1 2 3 4 5 6 7 8; do
    kwpc_graphql createMigrationTestIssue "$(jq -cn \
      --arg repoId "$REPO_ID" \
      --arg projectId "$PROJECT_ID" \
      --arg plugin "$plugin_name" \
      --arg tier "$tier" \
      --argjson milestone "$milestone_number" \
      --argjson test "$test_num" \
      '{repoId:$repoId, projectId:$projectId, plugin:$plugin, tier:$tier, milestone:$milestone, testNumber:$test}')"
  done

  # 3. Create tracking issue
  kwpc_graphql createTrackingIssue "$(jq -cn \
    --arg repoId "$REPO_ID" \
    --arg projectId "$PROJECT_ID" \
    --arg plugin "$plugin_name" \
    --argjson milestone "$milestone_number" \
    '{repoId:$repoId, projectId:$projectId, plugin:$plugin, milestone:$milestone}')"

  echo "  ✓ milestone #$milestone_number + 9 issues created"
done

echo "Bootstrap complete. Open the project board: https://github.com/orgs/$KWPC_REPO_OWNER/projects/$KWPC_PROJECT_NUMBER"
```

Running this once produces the complete migration plan as GitHub state. Every Issue, every Milestone, every Project card. Nothing in spreadsheets, nothing in docs — all queryable.

---

## 5. Test harness: what "passing" actually looks like

The eight acceptance tests from §2 run in a single CI workflow per plugin. The workflow is identical across plugins — parameterized by plugin name.

### `.github/workflows/acceptance-tests.yml`

```yaml
name: acceptance-tests
on:
  pull_request:
    paths:
      - '<plugin>/**'
      - 'packages/schema/**'
      - 'scripts/**'
  workflow_dispatch:
    inputs:
      plugin: { required: true, description: "Plugin name (e.g. legal-cli)" }

jobs:
  detect-changed-plugins:
    runs-on: ubuntu-latest
    outputs:
      plugins: ${{ steps.detect.outputs.plugins }}
    steps:
      - uses: actions/checkout@v4
      - id: detect
        run: |
          changed=$(git diff --name-only origin/main | awk -F/ '/-cli\//{print $1}' | sort -u | jq -R -s -c 'split("\n")|map(select(length>0))')
          echo "plugins=$changed" >> "$GITHUB_OUTPUT"

  run-tests:
    needs: detect-changed-plugins
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        plugin: ${{ fromJSON(needs.detect-changed-plugins.outputs.plugins) }}
    steps:
      - uses: actions/checkout@v4
      - name: Install Claude Code
        run: curl -fsSL https://claude.ai/install.sh | sh
      - name: Install jq and test deps
        run: sudo apt-get install -y jq curl

      - name: T1 - manifest validity
        run: claude plugin validate ${{ matrix.plugin }}/.claude-plugin/plugin.json

      - name: T2 - skill frontmatter lints
        run: python3 scripts/lint-skill-frontmatter.py ${{ matrix.plugin }}/skills/

      - name: T3 - command frontmatter lints
        run: python3 scripts/lint-command-frontmatter.py ${{ matrix.plugin }}/commands/

      - name: T4 - MCP config reachable
        run: bash scripts/check-mcp-reachable.sh ${{ matrix.plugin }}/.mcp.json

      - name: T5 - skills fire on trigger phrases
        run: bash scripts/test-skill-triggers.sh ${{ matrix.plugin }}

      - name: T6 - commands run on fixtures
        run: bash scripts/test-command-fixtures.sh ${{ matrix.plugin }}

      - name: T7 - GraphQL round-trip (if applicable)
        if: contains(fromJSON('["productivity-cli","product-management-cli","platform-engineering","it-admin"]'), matrix.plugin)
        run: bash scripts/test-graphql-roundtrip.sh ${{ matrix.plugin }}
        env:
          GITHUB_TOKEN:    ${{ secrets.TEST_GH_TOKEN }}
          KWPC_REPO_OWNER: ${{ github.repository_owner }}
          KWPC_REPO_NAME:  ${{ github.event.repository.name }}

      - name: T8 - docs complete
        run: bash scripts/docs-complete.sh ${{ matrix.plugin }}

  close-test-issues:
    needs: run-tests
    if: success()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Close acceptance-test issues for passing plugins
        run: bash scripts/close-passing-acceptance-tests.sh
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`close-passing-acceptance-tests.sh` is the magic step: when all 8 tests pass for a plugin in a PR, it finds the 8 acceptance-test Issues for that plugin and closes them with a reference to the merged PR. The tracking Issue auto-updates (because GitHub knows the referenced Issues closed). The Milestone percentage climbs.

When the 8th Issue closes, the Milestone hits 100% and GitHub closes it automatically. You don't manually manage Milestone state.

### Why this particular test suite

The 8 tests cover three risk axes:

1. **Static correctness** (T1-T3, T8) — catches the "ships but doesn't load" class of bugs. Cheap, run locally, run pre-PR.
2. **Integration correctness** (T4, T5, T7) — catches the "loads but doesn't do anything useful" class. Needs a real Claude Code install and real network.
3. **Functional correctness** (T6) — catches the "runs but produces garbage" class. Needs fixtures and output validators.

T6 is the most nontrivial. The validators live in `scripts/validators/<command>.py` and check that the command's output conforms to the expected shape. For `write-spec`, that's: "has these 6 markdown section headings." For `metrics-review`, that's: "contains a status color, at least 3 numbered bullet points, and a concluding recommendation." You don't need to validate *content quality* — that's not deterministic. You need to validate *structural correctness*, which is.

---

## 6. Migration sequence: which plugins first, and why

The order matters. Three principles guided the sequence:

**Principle 1: Ship the infrastructure before the dependents.**
`productivity-cli` and `product-management-cli` depend on the schema package and platform-engineering. Those three go first.

**Principle 2: Port Tier 1 plugins in parallel once infra lands.**
They're small and independent. A 3-person team can take 3 in parallel.

**Principle 3: Save the riskiest for last.**
`pdf-viewer-cli` requires the most new thinking. Getting 13 plugins shipped first means we have a repo full of patterns to copy from when we finally tackle it.

### Proposed sequence

**Wave 0 (weeks 1-2): Foundation**
Already in the design artifact. Complete and merge:
- `packages/schema` (the shared GraphQL schema + curl client)
- `platform-engineering` (plugin scaffolding + `/stack-check` + version pinning)
- `data-cli` (completion of existing scaffold)
- `it-admin` (`ant admin *` wrapper)

This is where the foundation for everything else lands. No acceptance tests for these yet because they're the *test infrastructure*, not tests of it. They get tested by being used.

**Wave 1 (weeks 3-5): PM plugins — the coordination layer**
- `productivity-cli`
- `product-management-cli`

Once these ship, every subsequent migration milestone is tracked *through them*. `/my-tasks` shows open acceptance-test Issues. `/sprint-planning` pulls from the `migration` label. `/stakeholder-update --audience engineering` writes a weekly update on migration progress. **This is where dogfooding starts.**

**Wave 2 (weeks 6-9): Tier 1 parallel ports**
Seven plugins, shippable independently. With the acceptance test harness running, every contributor has the same target. Port order within the wave doesn't matter — assign whatever each contributor has domain fit for.
- `legal-cli`
- `finance-cli`
- `sales-cli`
- `customer-support-cli`
- `marketing-cli`
- `operations-cli`
- `human-resources-cli`

**Wave 3 (weeks 10-13): Tier 2 redesigns**
Each needs some design decisions (what replaces HTML dashboards, how does `/standup` gather data without chat MCPs) but the pattern is now well-established.
- `engineering-cli`
- `design-cli`
- `enterprise-search-cli`

**Wave 4 (weeks 14-16): Tier 3 + polish**
- `pdf-viewer-cli` — the live-viewer redesign
- First release: `@anthropic-ai/*` at 0.1.0 published for all 14 plugins simultaneously

### Gantt-style summary

```
Weeks      1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
           ├──┤
Wave 0     [foundation: schema, platform-eng, data, it-admin]
                 ├─────┤
Wave 1           [prod, pm]
                       ├───────────┤
Wave 2                 [legal, finance, sales, support, marketing, ops, hr]
                                   ├─────────┤
Wave 3                             [engineering, design, search]
                                             ├─────┤
Wave 4                                       [pdf, release]
```

16 weeks total at one engineer's pace. Faster with a team because Wave 2 parallelizes.

---

## 7. Dogfooding: the PM plugins run the migration

The payoff of the architecture. Once Wave 1 is complete, every status meeting, every sprint plan, every stakeholder update *runs through the plugins we're building*. If they don't work, we can't coordinate the migration — which means bugs surface fast and get fixed fast.

### Monday morning example

An engineer runs:
```
/my-tasks --status in_progress --milestone "Plugin: legal-cli"
```

`productivity-cli` calls the schema's `myTasks` query, filtered by milestone. Returns:
```
#234  IN_PROGRESS  P1  legal-cli  T5: skills fire on trigger phrases
```

They work on it, open a PR. The acceptance-tests workflow runs. If T5 passes alongside T1-T4 and T6-T8 (which were already green from earlier PRs), `close-passing-acceptance-tests.sh` closes #234. The tracking Issue auto-updates to 8/8. The Milestone closes. A GitHub webhook (from release-please's own config) sees a completed milestone and cuts a `legal-cli@0.1.0` release candidate PR.

### Tuesday afternoon example

A PM runs:
```
/stakeholder-update --audience engineering --period weekly
```

`product-management-cli` queries:
- `currentSprint` for the active iteration
- Open milestones filtered by `migration`
- Closed issues this week labeled `acceptance-test`

Generates:
```markdown
# Weekly update: kwpc migration

## Status: Green

### This week
- legal-cli migration complete (milestone closed, released 0.1.0)
- finance-cli: 6 of 8 acceptance tests passing (tracking #298)
- sales-cli: blocked on HubSpot MCP server URL change (#312)

### Next week
- Finance-cli on track to close by Friday
- Sales-cli needs decision on HubSpot MCP fallback
- Wave 2 kicks off: customer-support-cli and marketing-cli assigned

### Pin drift this week
- None — all pins fresh as of Monday's check
```

All of this is GraphQL queries against GitHub's state. No spreadsheet. No slide deck. The source of truth is the same source of truth the engineers are writing against.

### What you prove by dogfooding

By Wave 2, you've demonstrated:
- The schema is rich enough to model real migration work
- The acceptance tests catch regressions before merge
- The PM plugins can coordinate a 12-plugin migration
- The version-pinning machinery works across releases
- The release-please automation cuts releases correctly

If any of these fail, the migration stalls — which is the right kind of feedback. Dogfooding makes the blockers visible immediately rather than discovering them 8 months in.

---

## Summary

- **14 plugins**, 2 new — one milestone per port
- **8 acceptance tests per plugin**, same structure everywhere
- **GitHub Milestones + Projects** as the tracking system, not a spreadsheet
- **GraphQL schema** from our earlier design is what the PM plugins query
- **4 waves** of parallel work, 16 weeks at a single-engineer cadence
- **Dogfooding** starts in week 5 once productivity-cli and product-management-cli ship

When you're ready to kick this off, the concrete first step is:

1. Create `anthropics/knowledge-work-plugins-cli` (empty repo + LICENSE + README stub)
2. Create a Project V2 called `kwpc-migration` with the fields from §3
3. Set `KWPC_PROJECT_NUMBER` as a repo variable
4. Run `scripts/bootstrap-migration.sh` — creates all 14 milestones and ~112 Issues in one command
5. Start Wave 0 against a living, queryable migration plan
