# Changelog

## [0.1.0] — 2026-05-14 (Sprint 1)

Initial scaffold mirroring `linkedin-maxvision` v0.1.0 pattern.

### Added

- MCP server (Hono + `@modelcontextprotocol/sdk` 1.x, stdio + HTTP transports)
- 16 v0.1 tools (10 read + 6 write):
  - Read: `x_search_posts`, `x_search_users`, `x_get_post`, `x_get_user_profile`, `x_get_user_timeline`, `x_get_followers`, `x_get_following`, `x_get_replies_tree`, `x_post_metrics`, `x_profile_activity`
  - Write: `x_post_tweet`, `x_reply`, `x_quote_tweet`, `x_like_unlike`, `x_follow_unfollow`, `x_send_dm`
- 4-layer hybrid backend: xAI Grok + X API v2 + Apify + Patchright fallback
- `LlmProvider` abstraction (Grok direct / OpenRouter passthrough)
- AES-256-GCM cookie encryption (paridade LinkedIn)
- Redis token bucket rate limit per-tool
- License gating via Cloudflare Worker (`/v1/check` 5min LRU cache)
- Drizzle ORM schema: posts_cache, users_cache, accounts, audit_log, rate_limit_events
- Docker Compose + Swarm + Portainer templates
- Cloudflare Worker (Stripe webhook → license issue)
- Landing CF Pages (index, pricing, thanks)
- 8 commands, 4 agents, 5 skills, 3 hooks (Claude Code plugin layer)

### Roadmap

- v0.2 — 10 more tools (trends, quotes, retweeters, monitor, DMs read, mute/block, media upload, alt-text, lists CRUD)
- v0.3 — Spaces transcript, Ads API (tier Agency Ads)
