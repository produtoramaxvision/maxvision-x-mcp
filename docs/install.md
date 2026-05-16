# Installation & Configuration

Complete setup guide for **MaxVision X Suite** on Windows, macOS, and Linux.

## Prerequisites

- **Claude Code** v1.0 or later (latest recommended)
- **Free tier** requires only an API key (no license needed)
- **Pro/Agency tiers** require a Stripe payment and license key
- **Minimum permissions:** Claude Code must have filesystem access to read environment variables

## Step 1: Get your API key

The easiest way:

1. Email `produtoramaxvision@gmail.com` with subject line **"API Key Request"** (any Free tier user can request)
2. Within 24 hours, you receive an email with your API key in format `mxv_<48hexadecimal>`
3. Save this key safely — it grants access to the X Suite API

Alternatively, you can sign up with a Google account on our pricing page at `https://x-api.produtoramaxvision.com.br/pricing.html` to auto-generate your Free tier API key immediately.

## Step 2: Set environment variables

The plugin requires exactly one variable for Free tier (`X_MAXVISION_API_KEY`). Pro/Agency users also set `X_MAXVISION_LICENSE`.

### Windows PowerShell

Open PowerShell **as Administrator** and run:

```powershell
# Set Free tier API key (required for all tiers)
[Environment]::SetEnvironmentVariable("X_MAXVISION_API_KEY", "mxv_<your_key_here>", "User")

# (Optional) Set Pro/Agency license key
[Environment]::SetEnvironmentVariable("X_MAXVISION_LICENSE", "MAXV-PRO-<your_license>", "User")
```

Verify the variable was set:

```powershell
[Environment]::GetEnvironmentVariable("X_MAXVISION_API_KEY", "User")
# Should output: mxv_xxxx...
```

### macOS & Linux (bash/zsh)

Edit your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
# Add these lines at the end
export X_MAXVISION_API_KEY="mxv_<your_key_here>"
export X_MAXVISION_LICENSE="MAXV-PRO-<your_license>"  # if Pro/Agency
```

Apply changes immediately:

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

Verify:

```bash
echo $X_MAXVISION_API_KEY
# Should output: mxv_xxxx...
```

### Claude Code settings.json (alternative method)

If environment variables don't work in your setup, you can also configure via Claude Code settings:

1. Open Claude Code settings file: `~/.claude/settings.json` (create if missing)
2. Add:

```json
{
  "mcp_servers": {
    "maxvision-x": {
      "env": {
        "X_MAXVISION_API_KEY": "mxv_xxxx...",
        "X_MAXVISION_LICENSE": "MAXV-PRO-..."
      }
    }
  }
}
```

3. Restart Claude Code

## Step 3: Install the plugin

In Claude Code, run:

```bash
/plugin install produtoramaxvision/maxvision-x-mcp
```

Claude Code downloads and registers the plugin automatically. This may take 30–60 seconds on first install.

## Step 4: Restart Claude Code

**This is mandatory.** Close Claude Code completely and reopen it. The environment variables are loaded at startup.

## Step 5: Verify installation

In a Claude Code conversation, ask Claude:

```
/x-status
```

Expected response:

```
Connected to MaxVision X Suite (v0.1.4)
Free tier: 6 read-only tools available
API: mxv_xxxx... (first 8 chars shown)
OAuth: Not connected (run /x-oauth-connect for write operations)
```

If you see an error, refer to the [Troubleshooting](#troubleshooting) section below.

## Step 6: Upgrade to Pro or Agency tier (optional)

### Pro Tier ($29/month or $290/year)

Unlocks 9 additional tools for writing, following, liking, and advanced interactions:
- `x_search_users`, `x_get_followers`, `x_get_following`, `x_get_replies_tree`
- `x_post_tweet`, `x_reply`, `x_quote_tweet`
- `x_like_unlike`, `x_follow_unfollow`

To upgrade:

1. Visit `https://x-api.produtoramaxvision.com.br/pricing.html`
2. Select **Pro** and complete Stripe checkout
3. Stripe sends a confirmation email with your license key (`MAXV-PRO-...`)
4. Set the license key in your environment variables (see Step 2)
5. Restart Claude Code
6. Run `/x-status` — Pro tools now appear

### Agency Tier ($99/month or $990/year)

Includes all Pro features plus:
- `x_send_dm` (direct messaging)
- Multi-account pool (manage multiple X accounts)
- n8n workflow integration
- White-label branding options

Setup is identical to Pro after purchase.

## Step 7: Enable write operations (OAuth setup)

Write tools (`x_post_tweet`, `x_reply`, `x_like_unlike`, etc.) require a one-time OAuth authorization with your X account.

### First-time setup

1. In Claude Code, ask Claude:

```
Connect my X account
```

2. Claude triggers the `/x-oauth-connect` command, which opens your default browser to X's OAuth consent screen
3. Log in with your X account and approve access (scope: read posts, write posts, like, follow, send DMs — as applicable to your tier)
4. X redirects back with a confirmation code
5. Claude stores the OAuth token locally and confirms: **"X account connected. Write tools are now enabled."**

The OAuth token is stored securely in Claude Code's local state and never leaves your machine (except in encrypted form to the X API when making requests).

### Reconnect / switch accounts

If you need to reconnect or switch X accounts:

```
/x-oauth-connect
```

This overwrites the previous token with a new one.

### Revoking access

To remove X Suite access from your X account:

1. Visit X Settings → **Apps and sessions** → **Connected apps**
2. Find **MaxVision X Suite** and click **Revoke**
3. Optionally, uninstall the Claude Code plugin: `/plugin uninstall produtoramaxvision/maxvision-x-mcp`

## Step 8: Self-host (advanced, optional)

If you prefer to run the MCP server on your own infrastructure:

### Prerequisites

- Docker 24+ and Docker Compose
- PostgreSQL 16+
- Redis 7+
- xAI API key (for Grok layer) — request from `support@x.ai`
- X API Bearer token (for Layer B) — request from X Developer Portal

### Quick start

```bash
git clone https://github.com/produtoramaxvision/maxvision-x-mcp
cd maxvision-x-mcp/mcp-server/docker

# Copy and edit environment file
cp .env.example .env
# Edit .env with your database, Redis, and API keys (see below)

# Start services
docker compose up -d

# Verify server is running
curl http://localhost:3000/mcp/health
# Should return: {"status":"ok"}
```

### Environment variables for self-host

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/maxvision_x` | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis connection for caching + rate limiting |
| `MASTER_KEY` | Yes | `<64 hex chars>` | Used to derive API keys locally; generate via `openssl rand -hex 32` |
| `XAI_API_KEY` | Yes (Layer A) | `xai_...` | From xAI console for Grok-based search |
| `X_API_BEARER_TOKEN` | Yes (Layer B) | `AAAA...` | From X API v2 (bearer token, not OAuth) |
| `PATCHRIGHT_ENABLED` | No | `true` / `false` | Enable Patchright layer for replies fallback; default `false` |
| `LOG_LEVEL` | No | `info` / `debug` | Default `info` |

### Connect Claude Code to self-hosted MCP

1. Uninstall the hosted plugin: `/plugin uninstall produtoramaxvision/maxvision-x-mcp`
2. In Claude Code settings (`~/.claude/settings.json`), add:

```json
{
  "mcp_servers": {
    "maxvision-x-self": {
      "url": "http://localhost:3000/mcp",
      "env": {
        "X_MAXVISION_API_KEY": "mxv_xxxx...",
        "X_MAXVISION_LICENSE": "MAXV-PRO-..."
      }
    }
  }
}
```

3. Restart Claude Code
4. Verify: `/x-status`

For detailed Docker setup, logs, and troubleshooting, see [Self-hosted Setup Guide](../SELF_HOST.md).

---

## Troubleshooting

### `CONFIG_FAIL: X_MAXVISION_API_KEY unset`

The API key environment variable is not set or Claude Code hasn't reloaded it.

**Fix:**
1. Verify the key is set correctly: `echo $X_MAXVISION_API_KEY` (bash) or `[Environment]::GetEnvironmentVariable("X_MAXVISION_API_KEY", "User")` (PowerShell)
2. **Restart Claude Code completely** (close and reopen)
3. Run `/x-status` again

### Plugin not appearing after install

Claude Code didn't reload the plugin list.

**Fix:**
1. `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Search for **"Claude: Reload Window"** and press Enter
3. Wait 30 seconds, then run `/x-status`

### `AUTH_FAIL: No OAuth token for account "default"`

You tried a write tool (e.g., `x_post_tweet`) without authorizing your X account first.

**Fix:** Run `/x-oauth-connect` and follow the browser-based OAuth flow.

### `AUTH_FAIL: OAuth token expired`

Your X OAuth token expired (rare; tokens usually last 2+ years).

**Fix:** Re-run `/x-oauth-connect` to refresh.

### `x_get_replies_tree` returns empty / "No results in 7-day window"

Layer B (X API v2) only searches posts from the last 7 days. Older tweets have no replies accessible.

**Fix (Free/Pro):** Search for a more recent tweet, or ask Claude to search by date range.

**Fix (Self-hosted with Patchright):** Set `PATCHRIGHT_ENABLED=true` in your `.env` to enable the browser-based layer, which can access older tweets (slower, limited by session).

### `EXTERNAL_API_FAIL: X API 429` (rate limit)

You've exceeded the X API rate limit for your tier.

**Fix:**
- **Free tier:** 50 requests/hour. Wait 1 hour or upgrade to Pro
- **Pro tier:** 300 requests/hour. Wait or upgrade to Agency
- **Agency tier:** 1000 requests/hour

Rate limits are shared per API key, not per session.

### `EXTERNAL_API_FAIL: X API 403` (forbidden)

Usually means you tried a write operation without proper OAuth or tier.

**Fix:**
1. Verify your tier: `/x-status`
2. If write tool: run `/x-oauth-connect`
3. If still failing, check that your license key (if Pro/Agency) is set correctly

### License key not recognized

`X_MAXVISION_LICENSE` env var is missing, malformed, or wrong tier.

**Fix:**
1. Verify it's set: `echo $X_MAXVISION_LICENSE` (bash) or PowerShell equivalent
2. Ensure format: `MAXV-PRO-...` (Pro) or `MAXV-AGN-...` (Agency)
3. Restart Claude Code
4. Run `/x-status` — should show your tier

### Self-host: container won't start

**Most common:** `MASTER_KEY` wrong format.

**Fix:**
- Generate a 64-hex key: `openssl rand -hex 32` (generates 64 hex chars)
- Update `.env` and restart: `docker compose restart`

Other common issues:
- PostgreSQL connection refused → verify `DATABASE_URL` and that PostgreSQL is running
- Redis connection refused → verify `REDIS_URL` and that Redis is running
- xAI or X API keys invalid → double-check format and permissions on those accounts

---

## Quick Start (pt-BR)

### Instalação rápida em 5 passos

1. **API Key:** Email `produtoramaxvision@gmail.com` — você recebe `mxv_<48hex>` dentro de 24h

2. **Env var (Windows PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("X_MAXVISION_API_KEY", "mxv_...", "User")
```

3. **Instalar plugin:**
```bash
/plugin install produtoramaxvision/maxvision-x-mcp
```

4. **Reiniciar Claude Code** (obrigatório)

5. **Verificar:**
```bash
/x-status
```

### Upgrade para Pro ($29/mês)

Visite `https://x-api.produtoramaxvision.com.br/pricing.html`, pague via Stripe, receba `MAXV-PRO-...`, configure a env var:

```powershell
[Environment]::SetEnvironmentVariable("X_MAXVISION_LICENSE", "MAXV-PRO-...", "User")
```

Reinicie Claude Code → tools de escrita desbloqueadas.

### Autorizar X account

```
/x-oauth-connect
```

Siga o fluxo OAuth no navegador → confirmação "X account connected".

Mais detalhes: [docs/install.md](install.md) em inglês.
