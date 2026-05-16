# MaxVision X Suite — Claude Code plugin

X (Twitter) automation for Claude Code: 16 MCP tools (read + write), 3-layer hybrid backend (xAI Grok + X API v2 + Patchright), Free / Pro / Agency tiers via Stripe.

> **Status:** v0.1.4 — production. Hosted MCP at `https://x-api.produtoramaxvision.com.br/mcp`.

## Installation

Complete setup guide available in [docs/install.md](docs/install.md). Quick steps:

### Step 1: Get API key

Email `produtoramaxvision@gmail.com` for Free tier API key (`mxv_<48hex>`), or visit [pricing page](https://x-api.produtoramaxvision.com.br/pricing.html) to auto-generate one.

### Step 2: Set environment variables

**Windows PowerShell (Administrator):**

```powershell
[Environment]::SetEnvironmentVariable("X_MAXVISION_API_KEY", "mxv_<your_key>", "User")
# Optional: Pro license
[Environment]::SetEnvironmentVariable("X_MAXVISION_LICENSE", "MAXV-PRO-...", "User")
```

**macOS/Linux:**

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export X_MAXVISION_API_KEY="mxv_<your_key>"
export X_MAXVISION_LICENSE="MAXV-PRO-..."  # optional
```

### Step 3: Install plugin

```bash
/plugin install produtoramaxvision/maxvision-x-mcp
```

### Step 4: Restart Claude Code and verify

```bash
/x-status
```

Expected output shows your tier (Free/Pro/Agency) and connected status.

For OAuth setup (write operations), troubleshooting, and self-host instructions, see [docs/install.md](docs/install.md) and [docs/troubleshooting.md](docs/troubleshooting.md).

## 16 MCP tools (v0.1)

**Free (no license):** `x_search_posts`, `x_get_post`, `x_get_user_profile`, `x_get_user_timeline`, `x_post_metrics`, `x_profile_activity`

**Pro:** `x_search_users`, `x_get_followers`, `x_get_following`, `x_get_replies_tree`, `x_post_tweet`, `x_reply`, `x_quote_tweet`, `x_like_unlike`, `x_follow_unfollow`

**Agency:** `x_send_dm`

## Architecture

3-layer active hybrid:

- **A** xAI Grok `x_search` (default reads, Grok-or-OpenRouter)
- **B** X API v2 OAuth 2.0 PKCE (writes + reads, 7-day search window)
- **D** Patchright + cookie `auth_token` (replies fallback, opt-in via `PATCHRIGHT_ENABLED=true`)

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
