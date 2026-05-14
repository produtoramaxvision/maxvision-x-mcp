# MaxVision X Suite — Claude Code plugin

X (Twitter) automation for Claude Code: 16 MCP tools v0.1 (read + write), 4-layer hybrid backend (xAI Grok + X API v2 + Apify + Patchright), Free / Pro / Agency tiers via Stripe.

> **Status:** v0.1.0 Sprint 1 in development. Implementation mirrors `linkedin-maxvision` v0.1.0 pattern (`maxvision-linkedin-mcp-git`).

## Quick start (user — once published)

```bash
# 1. Get an API key (Free tier — limited rate during beta)
#    Email produtoramaxvision@gmail.com — you receive mxv_<48hex>

# 2. Set env (Windows PowerShell)
[Environment]::SetEnvironmentVariable("MAXVISION_API_KEY", "mxv_xxxx", "User")

# 3. (Optional) Pro license
[Environment]::SetEnvironmentVariable("MAXVISION_LICENSE", "MAXV-PRO-...", "User")

# 4. Install
claude /plugin install produtoramaxvision/maxvision-x-mcp

# 5. Restart Claude Code → plugin auto-connects to hosted MCP at https://x-api.produtoramaxvision.com.br/mcp
# 6. Verify
/x-status
```

## 16 MCP tools (v0.1)

**Free (no license):** `x_search_posts`, `x_get_post`, `x_get_user_profile`, `x_get_user_timeline`, `x_post_metrics`, `x_profile_activity`

**Pro:** `x_search_users`, `x_get_followers`, `x_get_following`, `x_get_replies_tree`, `x_post_tweet`, `x_reply`, `x_quote_tweet`, `x_like_unlike`, `x_follow_unfollow`

**Agency:** `x_send_dm`

## Architecture

4-layer hybrid:

- **A** xAI Grok `x_search` (default reads, `LlmProvider` Grok-or-OpenRouter)
- **B** X API v2 pay-per-use OAuth (writes + cirurgical reads)
- **C** Apify apidojo Tweet Scraper V2 (bulk reads >1k)
- **D** Patchright + cookie `auth_token` (fallback ToS-grey, opt-in)

See [PLAN-SPRINT1.md](PLAN-SPRINT1.md) for full design.

## Self-host

```bash
git clone https://github.com/produtoramaxvision/maxvision-x-mcp
cd maxvision-x-mcp/mcp-server/docker
cp .env.example .env  # fill keys + secrets
docker compose up -d
```

Server boots at `http://localhost:3000/mcp`. See [`docs/setup-claude-code-only.md`](docs/setup-claude-code-only.md).

## License

- Free tier: AGPL-3.0
- Pro / Agency tier: proprietária (EULA) — repositório privado `maxvision-x-mcp-pro`

## Contact

`produtoramaxvision@gmail.com` · https://produtoramaxvision.com.br
