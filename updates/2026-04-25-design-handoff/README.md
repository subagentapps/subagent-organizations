# claude.ai/design handoff — live-artifact dashboard

Date: 2026-04-25 PDT (autonomous orchestrator iter 13)
Project URL: https://claude.ai/design/p/6dc4877b-8981-4ce1-8e8d-d2a4d16ae573
Project name: `subagentorganizations-live-artifact`
Mode: Prototype → Hi-fi design → Design System (Default)

## What happened

The autonomous orchestrator opened claude.ai/design via Chrome MCP, created a
new Prototype project, pasted the design brief from
`docs/spec/frontend/design-brief.md` (PR #54), and sent it.

The "Send" click triggered the design generation. Output appears at the
project URL above as a hi-fi interactive prototype.

## Brief sent (verbatim, condensed for the prompt input)

The brief below is the **paste-ready** condensation of `docs/spec/frontend/design-brief.md`. Source spec is the contract; this is the prompt-shaped delivery.

---

Project: live-artifact dashboard for subagentorganizations.com — a single-page React app that renders a polyrepo's GitHub Project board, issues, and PRs as a real-time tracker.

Aesthetic: flat-dark with a single teal accent. Inspired by Anthropic Labs' Cowork artifact + Linear/Vercel dashboards. Heavy typography, restrained color, generous whitespace. No drop shadows, no gradients, no rounded-corner skeuomorphism. Borders 1px only.

Background: #0a0a0a to #111 range. Foreground text #e5e5e5. Muted text #888. Single accent: teal in the #14b8a6 → #0d9488 range. Used SPARINGLY.

Typography: system stack for body. Monospace for code/issue-refs/SHAs. No Google Fonts; no third-party type loads.

Layout: 4 main routes — / (dashboard kanban), /plugins/:name, /adr + /adr/:number, /changelog.

Components: Issue card, Status column (Todo/In Progress/In Review/Done/Won't do), Plugin chip (8 muted colors, 1px outlined pill), Page shell (top nav, no sidebar/footer), 24×24 Braille-dot SVG logo.

Hidden requirement: <Field /> — subtle Braille-dot backdrop animation behind dashboard only, opacity 0.03, <2 fps drift.

Constraints: lucide-react only; no Tailwind YET; 768px mobile breakpoint; WCAG AA; <100 KB gzipped bundle.

Data shape: type Issue with number, title, repo, plugin (8-enum), status (5-enum), priority (4-enum), wave (4-enum), effort (5-enum), assignee, url.

Output: dashboard route fully designed + page shell + design system (CSS variables, type ramp, spacing).

Excluded: auth UI, charts, search, sidebar.

---

## Next iteration to follow up

1. Wait for the design generation to complete on the project page
2. Capture screenshots of the dashboard route + design system into this directory
3. Open follow-up issue with critique + iteration list (any divergences from the brief)
4. When prototype is approved, promote tokens (colors, spacing, type) into `src/apps/live-artifact/src/styles/` per `docs/spec/frontend/vite-scaffold.md`

## Status

- ✅ Project created, brief pasted, Send clicked
- ⏭ Generation completing in browser tab
- ⏭ Screenshots + critique in next iteration
