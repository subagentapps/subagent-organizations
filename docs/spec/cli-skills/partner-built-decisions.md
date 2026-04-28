# partner-built — per-sub-plugin migration decisions

> Status: load-bearing as of 2026-04-27
> Source: `vendor/anthropic/knowledge-work-plugins/partner-built/`
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md) §"Wave 4"

---

## What's in `partner-built/`

5 nested plugins from Anthropic's launch partners. Each is a separate
plugin under upstream's `partner-built/` directory:

| Sub-plugin | Owner | Skills (count) |
|---|---|---|
| `apollo` | Apollo (sales engagement) | 3 (enrich-lead, prospect, sequence-load) |
| `brand-voice` | Tribe AI | 3 (brand-voice-enforcement, discover-brand, guideline-generation) |
| `common-room` | Common Room | 6 (account-research, call-prep, compose-outreach, contact-research, prospect, weekly-prep-brief) |
| `slack` | Slack | 2 (slack-messaging, slack-search) |
| `zoom-plugin` | Zoom | 50+ (massive SDK / OAuth / video / phone / webhooks coverage) |

The user's iter-1 directive listed `partner-built-cli` (singular). Per
the strategy: each sub-plugin gets its own decision.

---

## Decisions

### 1. `slack` → **Wave-1 candidate** (skip — Slack works headless via MCP)

**Decision: do not port.**

The kwpc-cli equivalent is *enabling Slack MCP via opt-in*, which every
gh-native CLI plugin already documents. Users who want Slack add it to
their plugin's `.mcp.json` directly:

```json
"slack": {
  "type": "http",
  "url": "https://mcp.slack.com/mcp",
  "oauth": { "clientId": "1601185624273.8899143856786", "callbackPort": 3118 }
}
```

The Slack MCP requires OAuth via Cowork's callback port (3118). Per the
matrix, this is documented as "Slack opt-in if user OAuths" across
every Wave-1 / Wave-2 plugin's CONNECTORS.md.

A standalone `slack-cli` plugin would add no value — it would just be
2 Slack-search/messaging skills wrapping the same MCP that every other
plugin already opts into. **Skip; defer to per-plugin opt-in.**

### 2. `brand-voice` → **Already adopted as reference** (skip)

**Decision: do not port.**

The kwpc-cli equivalent is `docs/spec/brand/voice.md` in the meta-repo.
The Tribe AI brand-voice plugin's "We Are / We Are Not" + tone-flexes
framework was adopted directly into our brand voice spec on 2026-04-26
([PR #109](https://github.com/subagentapps/subagent-organizations/pull/109)
in subagent-organizations).

Porting brand-voice as a CLI plugin would duplicate work we already
encoded as canonical brand operations. **Skip; reference is in place.**

### 3. `apollo` → **Defer** (sales-engagement-coupled, like sales-cli)

**Decision: defer.**

Apollo is a sales-engagement / data-enrichment commercial product. The
plugin's 3 skills (enrich-lead, prospect, sequence-load) all require
the Apollo API + OAuth.

Same rationale as sales-cli's defer status: until commercial CRM /
data-enrichment MCPs come online, this plugin can't deliver value
headless. The kwpc-cli's sales-cli already covers `account-research`
and `draft-outreach` skills generically.

**Skip; covered by sales-cli's scaffold-and-wait posture.**

### 4. `common-room` → **Defer** (community-intelligence; no MCP path today)

**Decision: defer.**

Common Room is a community-intelligence platform. 6 skills, all require
the Common Room API + OAuth + commercial subscription.

**Skip; same posture as apollo + sales-cli.**

### 5. `zoom-plugin` → **Defer** (massive SDK surface, way out of scope)

**Decision: defer.**

The Zoom plugin is a 50+ skill mega-plugin covering Zoom's video / phone
/ contact-center / SDK / OAuth / webhooks surfaces. Skills like
`build-zoom-bot`, `meeting-sdk/{android,ios,web,electron,unity,...}`,
`virtual-agent/{android,ios,web}`, `zoom-mcp/whiteboard`, etc.

This is a **vendor-led developer SDK**, not a knowledge-work plugin in
the same shape as the others. Its CLI equivalent would be a
"build-with-Zoom" plugin — orthogonal to the kwpc-cli's productivity /
PM / engineering / etc. focus.

**Skip; vendor-led SDK out of scope for kwpc-cli.**

---

## Summary

5 partner-built sub-plugins → **0 ports**:

- 2 already covered (slack via opt-in, brand-voice via meta-repo spec)
- 3 deferred (apollo + common-room → covered by sales-cli's scaffold; zoom-plugin → out of scope)

The user's iter-1 directive listed `partner-built-cli` — this doc is the
deliverable for that line item. No new code; the architecture decision
documents the why.

---

## Provenance

- Upstream: `vendor/anthropic/knowledge-work-plugins/partner-built/` (Apache-2.0)
- Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md) §"Wave 4 — partner-built sub-plugins"
- Brand voice (where brand-voice's framework lives): [`../brand/voice.md`](../brand/voice.md)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
