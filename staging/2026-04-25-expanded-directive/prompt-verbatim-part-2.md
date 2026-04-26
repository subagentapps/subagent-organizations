# User's expanded directive — verbatim, part 2

Captured: 2026-04-25 PST evening (continuation of `prompt-verbatim.md`)
Status: read-only audit input. Decompositions live in
`docs/spec/orchestration-strategy.md` and `installs/prompts/`.

## Third message — orchestrator + autonomous-agents architecture

Verbatim user text. Hyperlinks preserved in their original positions —
they are load-bearing context for future iterations and should not be
trimmed in promotion.

> one to note is the two "ultra*{review,plan}" are existing features. see
> `/Users/alexzh/claude-projects/github-organizations/subagentapps/subagent-organizations/updates/claude-code/2026-w15/digest.md`
> [Image #2]. ultra plan was in wk15
> https://code.claude.com/docs/en/whats-new/2026-w15.md and ultra review
> is already a slash command in the claude-code/CHANGELOG.md and will be
> in wk16 https://code.claude.com/docs/en/whats-new/2026-w16 that isn't
> done yet. we may want to store a copy of
> https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md tied to
> the latest version
> https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.119. what
> we should do is figure out the process anthropics/ engineers use in
> their projects to properly intake updates and integrate into their own
> systems. for instance:
>
> - https://github.com/bcherny?tab=repositories
> - https://x.com/bcherny
> - https://github.com/anthropics/claude-code/graphs/contributors
> - https://github.com/anthropics/claude-cookbooks/graphs/contributors
> - https://github.com/anthropics/claude-code-security-review/graphs/contributors
> - https://github.com/anthropics/claude-code-action/graphs/contributors
> - https://github.com/anthropics/knowledge-work-plugins/graphs/contributors
> - https://github.com/anthropics/claude-agent-sdk-typescript/graphs/contributors
> - https://github.com/anthropics/claude-agent-sdk-python/graphs/contributors
> - dk-python/graphs/contributors
> - https://github.com/modelcontextprotocol/python-sdk
> - https://github.com/modelcontextprotocol/experimental-ext-skills
> - https://github.com/modelcontextprotocol/inspector
> - https://github.com/modelcontextprotocol/registry
> - https://github.com/modelcontextprotocol/typescript-sdk
> - https://github.com/modelcontextprotocol/ext-apps
>
> i want you to think through how you are the orchestrator subagent that
> makes autonomous changes in this repo that moving forward should aim to
> be the product-management oriented chief of staff orchestrator who
> manages my token budget on this admin@jadecli.com account and
> permanently runs using a 1 hour cron jobs for 24 hours a day 7 days a
> week to update the polyrepo engineering work we've done so far. i want
> a daily brief of what our objectives are. i also want you to experiment
> with first 1 then up to 3 additional autonomous agents running on a 10
> minute cron job that you assign github tasks to per repo once our
> productivity-cli and project-management-cli is working. for instance,
> i want you to implement a engineering subagent based on engineering-cli
> to build out our polyrepo infrastructure and gets updates from
> https://www.anthropic.com/engineering posts converted to markdown and
> https://job-boards.greenhouse.io/anthropic?keyword=engineer like
> https://job-boards.greenhouse.io/anthropic/jobs/4020350008 and
> https://job-boards.greenhouse.io/anthropic/jobs/5097186008. we want to
> build out a monetization team using functional skills, tech stack, and
> documented strategies like
> https://job-boards.greenhouse.io/anthropic?keyword=monetization
> https://job-boards.greenhouse.io/anthropic/jobs/5146363008
> https://job-boards.greenhouse.io/anthropic/jobs/5174743008
> https://job-boards.greenhouse.io/anthropic/jobs/5174747008
> https://job-boards.greenhouse.io/anthropic/jobs/5181852008
> https://job-boards.greenhouse.io/anthropic/jobs/5153773008.
>
> we want to empower our knowledge and codebases with help from a
> subagent science subagent and team https://www.anthropic.com/science
>
> a research subagent and team https://www.anthropic.com/research
> https://job-boards.greenhouse.io/anthropic?keyword=research
> https://job-boards.greenhouse.io/anthropic/jobs/4951814008
>
> we should start with this research engineer and research scientist and
> create a staff token engineer, staff token researcher, and staff token
> scientist based on https://job-boards.greenhouse.io/anthropic/jobs/4951814008
>
> that helps you build out the technical stack we already began but need
> to build out to manage our cost usage and observability analytics to
> run these autonomous agents.
>
> Languages: Python, TypeScript
>
> Frameworks: FastAPI, React
>
> Infrastructure: GCP, Kubernetes, Cloud Run, AWS, Azure
>
> Databases: PostgreSQL (AlloyDB), Vector Stores, Firestore
>
> Tools: Feature Flagging, Prometheus, Grafana, Datadog
>
> [Image: source: /Users/alexzh/claude-projects/github-organizations/subagentapps/subagent-organizations/updates/claude-code/2026-w15/week15-01-ultraplan.png]

## Fourth message — the cost ceiling + schedule infra answers

Captured from `AskUserQuestion` response. The user explicitly chose:

**Q1 — cost ceiling**: *"max the plan gets 20x usage per month
https://support.claude.com/en/articles/11049741-what-is-the-max-plan so
i stay at the $200 plan usage and prefer not to use additional budget
until i see results from this in 1 to 2 weeks. i also have a second
account alex@jadecli.com with a max plan on this device surface. i want
to run both autonomously as my macbook can run 24/7 at home"*

**Q2 — schedule infra** (linked the canonical Anthropic platforms doc):

> https://code.claude.com/docs/en/platforms.md ->
>
> | | Trigger | Claude runs on | Setup | Best for |
> |:---|:---|:---|:---|:---|
> | Dispatch | Message a task from the Claude mobile app | Your machine (Desktop) | Pair the mobile app with Desktop | Delegating work while you're away, minimal setup |
> | Remote Control | Drive a running session from claude.ai/code or the Claude mobile app | Your machine (CLI or VS Code) | Run `claude remote-control` | Steering in-progress work from another device |
> | Channels | Push events from a chat app like Telegram or Discord, or your own server | Your machine (CLI) | Install a channel plugin or build your own | Reacting to external events like CI failures or chat messages |
> | Slack | Mention `@Claude` in a team channel | Anthropic cloud | Install the Slack app with Claude Code on the web enabled | PRs and reviews from team chat |
> | Scheduled tasks | Set a schedule | CLI, Desktop, or cloud | Pick a frequency | Recurring automation like daily reviews |
>
> https://code.claude.com/docs/en/channels.md
> https://code.claude.com/docs/en/scheduled-tasks.md
> https://code.claude.com/docs/en/desktop#sessions-from-dispatch
> https://code.claude.com/docs/en/routines#automate-work-with-routines.md

**Q3 — team vs tasks**: *"this is a stretch goal we don't need to rush
to implement. i'd rather start off incrementally add more automation
strategies per day once we have the research for the engineer, science,
technology, machine learning, retrieval and search system design in
place informed by dogfooding what we built"*

**Q4 — PR split**: `Split into 3 PRs by topic`

## Fifth message — strategy doc + dogfood gate + tools-reference + Projects

Verbatim user text. Includes a large embedded copy of
`https://code.claude.com/docs/en/tools-reference.md` and
`https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects`,
both already incorporated into `docs/spec/orchestration-strategy.md`. Original
user message:

> i want you to document the strategy that has been working for us till
> now. im not ready to introduce a change with the second account until
> you build the frontend dashboard that i shared to you into staging
> `/Users/alexzh/claude-projects/github-organizations/subagentapps/subagent-organizations/staging/2026-04-25-akw-artifact-context`
> and you start using the product-management-cli and productivity-cli
> for task management where tasks are based on the
> https://code.claude.com/docs/en/tools-reference.md
>
> [embedded full content of tools-reference.md — captured verbatim into
>  docs/spec/orchestration-strategy.md §3]
>
> # CONTEXT
> ### https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects
>
> [embedded GitHub Projects About docs — captured verbatim into
>  docs/spec/orchestration-strategy.md §4]
>
> # OBJECTIVE
>
> There is clear context for exactly how we want to implement our
> knowledge-work-plugins-cli to be used by you autonomously to
> effectively use product-management as an agent in the terminal cli as
> an innovation over existing cowork human driven process. You must
> learn product-management-cli and productivity-cli and keep using the 5
> minute cron jobs to orchestrate work to complete the milestone driven
> project. once you pass this milestone, then we want to implement the
> engineering-cli. only once you successfully get all skills working on
> migrated then will alex-jadecli use a second autonomous agent.
>
> Project URLs:
> - https://github.com/subagentapps/knowledge-work-plugins-cli/projects?query=is%3Aopen
> - https://github.com/subagentapps/knowledge-work-plugins-cli/projects?query=is%3Aopen+is%3Atemplate
> - https://github.com/subagentapps/subagent-organizations/projects?query=is%3Aopen
> - https://github.com/orgs/subagentapps/projects?query=is%3Aopen

## Sixth message — save the last few large prompts

> please save the last few large prompts as well, they had very detailed
> and hyperlinked artifacts and links we want to maintain as context

That's this file.

## Hyperlinked artifacts (consolidated, preserved verbatim)

Surfacing every URL/link from messages 3-5 in one place so future
iterations can `grep` this file for any reference:

### Anthropic platform / docs

- https://code.claude.com/docs/en/whats-new/2026-w15.md
- https://code.claude.com/docs/en/whats-new/2026-w16
- https://code.claude.com/docs/en/platforms.md
- https://code.claude.com/docs/en/channels.md
- https://code.claude.com/docs/en/scheduled-tasks.md
- https://code.claude.com/docs/en/desktop#sessions-from-dispatch
- https://code.claude.com/docs/en/routines#automate-work-with-routines.md
- https://code.claude.com/docs/en/tools-reference.md
- https://www.anthropic.com/engineering
- https://www.anthropic.com/science
- https://www.anthropic.com/research
- https://support.claude.com/en/articles/11049741-what-is-the-max-plan
- https://www.anthropic.com/engineering/contextual-retrieval (from prompt-verbatim.md)
- https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide (from prompt-verbatim.md)

### Anthropic GitHub repos (org `anthropics/`)

- https://github.com/anthropics/claude-code (CHANGELOG.md as load-bearing version pin)
- https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- https://github.com/anthropics/claude-cookbooks/graphs/contributors
- https://github.com/anthropics/claude-code-security-review/graphs/contributors
- https://github.com/anthropics/claude-code-action/graphs/contributors
- https://github.com/anthropics/knowledge-work-plugins/graphs/contributors
- https://github.com/anthropics/claude-agent-sdk-typescript/graphs/contributors
- https://github.com/anthropics/claude-agent-sdk-python/graphs/contributors

### MCP repos (org `modelcontextprotocol/`)

- https://github.com/modelcontextprotocol/python-sdk
- https://github.com/modelcontextprotocol/typescript-sdk
- https://github.com/modelcontextprotocol/inspector
- https://github.com/modelcontextprotocol/registry
- https://github.com/modelcontextprotocol/ext-apps
- https://github.com/modelcontextprotocol/experimental-ext-skills

### People

- https://github.com/bcherny?tab=repositories
- https://x.com/bcherny

### Greenhouse — Anthropic job postings (research / engineering / monetization)

Anchor for research engineer / research scientist (load-bearing):

- https://job-boards.greenhouse.io/anthropic/jobs/4951814008

Engineering anchors:

- https://job-boards.greenhouse.io/anthropic?keyword=engineer
- https://job-boards.greenhouse.io/anthropic/jobs/4020350008
- https://job-boards.greenhouse.io/anthropic/jobs/5097186008

Monetization anchors:

- https://job-boards.greenhouse.io/anthropic?keyword=monetization
- https://job-boards.greenhouse.io/anthropic/jobs/5146363008
- https://job-boards.greenhouse.io/anthropic/jobs/5174743008
- https://job-boards.greenhouse.io/anthropic/jobs/5174747008
- https://job-boards.greenhouse.io/anthropic/jobs/5181852008
- https://job-boards.greenhouse.io/anthropic/jobs/5153773008

Research search:

- https://job-boards.greenhouse.io/anthropic?keyword=research

KB-relevant (from prompt-verbatim.md part 1):

- https://job-boards.greenhouse.io/anthropic/jobs/5197337008

### npm

- https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.119

### subagentapps Projects (the dogfood substrate)

- https://github.com/subagentapps/knowledge-work-plugins-cli/projects?query=is%3Aopen
- https://github.com/subagentapps/knowledge-work-plugins-cli/projects?query=is%3Aopen+is%3Atemplate
- https://github.com/subagentapps/subagent-organizations/projects?query=is%3Aopen
- https://github.com/orgs/subagentapps/projects?query=is%3Aopen

### Sitemaps + llms.txt (KB ingestion targets, from part-1)

- support.claude.com/sitemap.xml
- platform.claude.com/sitemap.xml
- platform.claude.com/llms.txt
- code.claude.com/docs/llms.txt
- anthropic.com/sitemap.xml
- claude.com/sitemap.xml

### Cloudflare resources (from part-1)

- https://dash.cloudflare.com/e6294e3ea89f8207af387d459824aaae/secrets-store/565244614fc34be7aa8488ce46112f60
- subagentorganizations.com (user-owned domain)

### subagentapps repos to vendor (from part-1)

- https://github.com/subagentapps/subagent-xml
- https://github.com/subagentapps/subagent-crawls
- https://github.com/subagentapps/subagents-platform-execution
- https://github.com/subagentapps/warehouse
- https://github.com/subagentapps/anthropic-docs-scraper

## Audit-trail policy

Read-only after copy. Edits go in `docs/spec/orchestration-strategy.md`,
not here. Future iterations should `grep` this file for any URL they
need rather than re-asking the user.
