# X / Twitter plugins for Claude Code

Date: 2026-04-26 (PST 2026-04-25 evening)
Method: GitHub repo search for `twitter x mcp claude` with stars > 5
Companion to: [`./bcherny-signal.md`](./bcherny-signal.md)

## Why this exists

Per user instruction: *"if you use computer tool or chrome, i signed into a new profile 'addyjadecli' so you can review x.com/bcherny, consider if there's a existing skill or plugin for twitter which is x that's friendly to you."*

The Chrome MCP works for one-off harvest (we did it for bcherny — see `bcherny-signal.md`),
but for repeated programmatic access, an MCP server is the right shape. We compared 5
candidates by stars + last-update + Claude-friendliness.

## Candidates (top 5 by stars)

| # | Repo | Stars | Surface | Claude-friendly? | Notes |
|---|---|---|---|---|---|
| 1 | [`nirholas/XActions`](https://github.com/nirholas/XActions) | 227 | MCP + CLI + browser scripts | ✅ MCP server explicitly | Most established. "No API fees." Includes scrapers, follow/unfollow, analytics. |
| 2 | [`replica882/twitter-bridge-mcp`](https://github.com/replica882/twitter-bridge-mcp) | 120 | MCP server, browser-bridged | ✅ Designed for Claude.ai | **Best fit for our use case.** README explicitly: *"Connect Claude.ai to Twitter/X via browser automation — no API key needed."* 19 typed tools. Cost: ~$5/year (just a domain for Cloudflare Tunnel). Active (v0.6.1 just released). |
| 3 | [`Xquik-dev/x-twitter-scraper`](https://github.com/Xquik-dev/x-twitter-scraper) | 59 | Skill + 111 REST + 2 MCP tools | ✅ Multi-agent (Claude/Codex/Cursor/+40) | Pay-per-use ($0.00015/call); 33× cheaper than official X API. |
| 4 | [`0xGval/twitter-X-mcp-server`](https://github.com/0xGval/twitter-X-mcp-server) | 19 | MCP server (Claude Desktop) | ✅ Claude Desktop focused | Smaller; search-focused. |
| 5 | [`checkra1neth/xbird-skill`](https://github.com/checkra1neth/xbird-skill) | 13 | Skill (uses xbird-mcp) | ✅ multi-agent | Uses external xbird-mcp service. |

## Recommendation: `replica882/twitter-bridge-mcp`

Best fit for our setup because:

1. **No API key needed.** Bypasses Twitter's $100/mo API tier by automating a logged-in
   Chrome session — same pattern we already use for `claude-in-chrome` MCP.
2. **Wraps the same Chrome session we already use.** Connects via CDP (Chrome DevTools
   Protocol) on port 9222, same surface as `mcp__claude-in-chrome`. Our setup already
   has Chrome with remote debugging available; this adds Twitter-specific tools on top.
3. **19 typed tools** including `twitter_post`, `twitter_search`, `twitter_timeline`,
   `twitter_view_tweet` (with `include_replies`), `twitter_mentions`, `twitter_user`.
   We need `view_tweet` and `user` (= profile fetch) for the bcherny signal pipeline.
4. **OAuth tokens persist** to `.tokens.json` (v0.6.1) — survives server restart.
5. **Active** — v0.6.1 shipped after the user's initial X capture date in this session.

## Architecture as it would land in our stack

```
~/.claude/orchestrator/sources/bcherny.ts (planned, our SDK)
       │
       │ JSON-RPC over MCP
       ▼
twitter-bridge-mcp on localhost:8080  ← runs via launchd or `bun run dev`
       │
       │ Chrome DevTools Protocol (port 9222)
       ▼
Chrome (logged in as addyjadecli)
       │
       ▼
x.com/bcherny rendered DOM
```

Compared to our current method (one-off Chrome MCP harvest):

| Attribute | One-off Chrome MCP (today) | twitter-bridge-mcp (proposed) |
|---|---|---|
| Setup time | None | ~30 min (Chrome + tunnel + .env) |
| Per-call cost | Conversation tokens | ~0 marginal token cost |
| Reliability | Manual retry on virtualization stalls | Automated; bb-browser handles scrolls |
| Authenticated access | Yes (existing profile) | Yes (same Chrome profile) |
| Reusable across sessions | No | Yes |
| Programmable from `kb-keeper` | No (interactive only) | Yes |

For the **/loop run** we're about to execute, sticking with the one-off Chrome MCP
approach is fine. For the **next polyrepo phase** (when `kb-keeper` runs scheduled
refreshes), install `twitter-bridge-mcp` so bcherny tweets get pulled automatically on
the same 12-hour cadence as the Anthropic docs.

## Anti-pattern flag

X has a real rate-limit and TOS. If we ever auto-post or auto-follow, two failure modes:

1. **Rate-limit / shadow-ban** — abuse triggers Twitter's anti-bot. Our use case is
   read-only signal harvest; we don't post. Stay read-only.
2. **TOS violation** — automated browser sessions to read public profiles are gray;
   posting at scale is clearly forbidden. The plugins we're surveying all use the same
   workaround. Not our problem to solve, but worth knowing.

## Out of scope

- Twitter's official API (cost-prohibitive)
- Posting / auto-replies / auto-follows from `kb-keeper`
- Any path that requires running as `addyjadecli` outside the user's local Chrome

## Action plan

| When | What | Where |
|---|---|---|
| **Now (this PR)** | Document the candidate list + recommendation | this file |
| **Loop task — Phase 4 deferred** | Install `twitter-bridge-mcp` on local machine | `installs/twitter-bridge-install.md` (new) |
| **When kb-keeper ships** | Wire bcherny as a scheduled source | `src/subagentmcp-sdk/knowledge-base/sources/bcherny-x.ts` |

## Sources

All 5 repos surveyed via `mcp__plugin_github_github__search_repositories` (GraphQL —
token-efficient per KB tool-precedence). Search query: `twitter x mcp claude in:name,description stars:>5`.
