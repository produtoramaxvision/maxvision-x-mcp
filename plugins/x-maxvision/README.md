# MaxVision X Suite — Claude Code plugin

X (Twitter) automation: 16 MCP tools v0.1, 8 commands, 4 agents, 5 skills, 3 hooks.

> **Status:** v0.1.0 — MCP target `https://x-api.produtoramaxvision.com.br/mcp`.

## Install

1. Get an API key (email `produtoramaxvision@gmail.com` — receive `mxv_<48hex>`).
2. Set env (Windows PowerShell):
   ```powershell
   [Environment]::SetEnvironmentVariable("MAXVISION_API_KEY", "mxv_xxxx", "User")
   ```
   (close + reopen terminal after)
   - macOS/Linux:
   ```bash
   echo 'export MAXVISION_API_KEY=mxv_xxxx' >> ~/.zshrc
   source ~/.zshrc
   ```
3. (Optional) Pro license:
   ```powershell
   [Environment]::SetEnvironmentVariable("MAXVISION_LICENSE", "MAXV-X-PRO-...", "User")
   ```
4. Install plugin:
   ```bash
   claude /plugin install produtoramaxvision/maxvision-x-mcp
   ```
5. Restart Claude Code.
6. Verify: `/x-status`.

## 16 tools

**Free:** `x_search_posts` · `x_get_post` · `x_get_user_profile` · `x_get_user_timeline` · `x_post_metrics` · `x_profile_activity`

**Pro:** `x_search_users` · `x_get_followers` · `x_get_following` · `x_get_replies_tree` · `x_post_tweet` · `x_reply` · `x_quote_tweet` · `x_like_unlike` · `x_follow_unfollow`

**Agency:** `x_send_dm`

## Commands

`/x-search` · `/x-post` · `/x-thread` · `/x-reply` · `/x-profile` · `/x-monitor` · `/x-trends` · `/x-cookie-refresh` · `/x-status`

## Agents

`x-content-creator` · `x-engagement-monitor` · `x-growth-strategist` · `x-trend-analyst`

## Skills

`x-tos-compliance` · `x-anti-detect-rules` · `x-content-strategy` · `x-engagement-playbook` · `lgpd-gdpr-handling`

## Architecture

4-layer hybrid: xAI Grok (read) + X API v2 (write) + Apify (bulk) + Patchright (fallback). See [PLAN-SPRINT1.md](../../PLAN-SPRINT1.md).
