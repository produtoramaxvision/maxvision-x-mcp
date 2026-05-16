# Changelog

## [0.1.4] — 2026-05-15 (Layer D Patchright)

### Added

- `patchright-x.ts` — Layer D browser scraper that intercepts `TweetDetail` GraphQL responses from x.com
- `browser/context.ts` — Chromium context factory using account cookies from `accounts` table (AES-256-GCM encrypted)
- `browser/pool.ts` — active browser context counter
- `x_get_replies_tree` now falls back to Layer D when Layer B returns 0 results and `PATCHRIGHT_ENABLED=true`
- Docker image `maxvision-x-mcp:v0.1.4` baked with `patchright` + arm64 Chromium at `/app/browsers`

---

## [0.1.3] — 2026-05-15 (Layer B replies via X API v2)

### Changed

- `x_get_replies_tree`: replaced Apify Layer C with X API v2 `search/recent?query=conversation_id:<id>` (Layer B)
- `apify-x.ts` scraper removed (Apify FREE plan blocks `apidojo~tweet-scraper` with `{noResults:true}`)

---

## [0.1.2] — 2026-05-15 (grok-4.3 + OAuth PKCE)

### Changed

- Layer A migrated to xAI Responses API (`/v1/responses`, model `grok-4.3`)
- `LlmProvider` now calls Responses API with `tools: [{ type: "x_search" }]` and returns `output[].content` citations

### Added

- OAuth 2.0 PKCE user-context flow:
  - `GET /admin/oauth-start?accountId=` — generates PKCE challenge, redirects to x.com
  - `GET /admin/oauth-callback?code=&state=` — exchanges code, stores encrypted token in `oauth_tokens`
  - `GET /x-oauth-connect` — friendly alias for oauth-start
- `oauth_tokens` table: `accountId`, `accessToken` (enc), `refreshToken` (enc), `expiresAt`
- Automatic token refresh 5 min before expiry in `x-api/client.ts`

---

## [0.1.0] — 2026-05-14 (Sprint 1)

Initial scaffold.

### Added

- MCP server (Hono + `@modelcontextprotocol/sdk` 1.x, stdio + HTTP transports)
- 16 v0.1 tools (10 read + 6 write):
  - Read: `x_search_posts`, `x_search_users`, `x_get_post`, `x_get_user_profile`, `x_get_user_timeline`, `x_get_followers`, `x_get_following`, `x_get_replies_tree`, `x_post_metrics`, `x_profile_activity`
  - Write: `x_post_tweet`, `x_reply`, `x_quote_tweet`, `x_like_unlike`, `x_follow_unfollow`, `x_send_dm`
- `LlmProvider` abstraction (Grok direct / OpenRouter passthrough)
- AES-256-GCM cookie encryption
- Redis token bucket rate limit per-tool
- License gating via Cloudflare Worker (`/v1/check` 5min LRU cache)
- Drizzle ORM schema: posts_cache, users_cache, accounts, audit_log, rate_limit_events, oauth_tokens
- Docker Compose + Swarm + Portainer templates
- Cloudflare Worker (Stripe webhook → license issue)
- Landing CF Pages (index, pricing, thanks)
- 8 commands, 4 agents, 5 skills, 3 hooks (Claude Code plugin layer)

### Roadmap

- v0.2 — 10 more tools (trends, quotes, retweeters, monitor, DMs read, mute/block, media upload, alt-text, lists CRUD)
- v0.3 — Spaces transcript, Ads API (tier Agency Ads)
