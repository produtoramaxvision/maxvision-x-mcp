# Troubleshooting Guide

Common issues and solutions for **MaxVision X Suite**.

## Error: `CONFIG_FAIL: X_MAXVISION_API_KEY unset`

**What it means:** The plugin cannot find your API key in environment variables.

**Causes:**
- Environment variable not set
- Claude Code hasn't reloaded environment variables since you set them
- Variable set in wrong scope (e.g., System instead of User on Windows)

**Solutions:**

1. **Verify the key is set:**
   - **PowerShell (Windows):**
     ```powershell
     [Environment]::GetEnvironmentVariable("X_MAXVISION_API_KEY", "User")
     # Should output: mxv_xxxx...
     ```
   - **bash/zsh (macOS/Linux):**
     ```bash
     echo $X_MAXVISION_API_KEY
     # Should output: mxv_xxxx...
     ```

2. **If empty, set it again** (follow the installation guide for your OS)

3. **Restart Claude Code completely:**
   - Close all Claude Code windows
   - Wait 5 seconds
   - Reopen Claude Code
   - Run `/x-status`

4. **If still failing:** Try the alternative method (Claude Code `settings.json`):
   - Edit `~/.claude/settings.json`
   - Add the API key directly in the `mcp_servers` config (see [Install guide, step 2](install.md#step-2-set-environment-variables))

---

## Error: Plugin not showing up in Claude Code

**What it means:** After running `/plugin install`, the plugin doesn't appear in your tool list.

**Causes:**
- Plugin installation didn't complete
- Claude Code didn't reload the plugin list after install
- Network timeout during plugin download

**Solutions:**

1. **Check installation status:**
   ```bash
   /plugin list
   ```
   Look for `produtoramaxvision/maxvision-x-mcp` in the output.

2. **If not listed, try reinstalling:**
   ```bash
   /plugin install produtoramaxvision/maxvision-x-mcp
   ```
   Wait for "Installation complete" message (30–60 seconds).

3. **Reload Claude Code:**
   - **Keyboard:** Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)
   - Search for **"Claude: Reload Window"**
   - Press Enter
   - Wait 10 seconds

4. **Verify again:**
   ```bash
   /x-status
   ```

5. **If still failing:** Check your internet connection and try again in 5 minutes.

---

## Error: `AUTH_FAIL: No OAuth token for account "default"`

**What it means:** You tried to use a write tool (e.g., `x_post_tweet`, `x_like_unlike`) without authorizing your X account first.

**Causes:**
- You skipped the OAuth setup step
- OAuth session expired or was revoked from X settings
- You switched X accounts without re-running OAuth

**Solutions:**

1. **Authorize your X account:**
   ```bash
   /x-oauth-connect
   ```

2. **A browser window opens** → log in with your X account

3. **Approve the MaxVision X Suite app** on the consent screen (scope: read/write posts, like, follow, DM as applicable)

4. **X redirects back to Claude Code** with confirmation: **"X account connected. Write tools now enabled."**

5. **Test a write tool:**
   ```bash
   Ask Claude: Post a test tweet saying "Connected to MaxVision X Suite"
   ```

If you see the same error after OAuth, try re-running `/x-oauth-connect` to refresh the token.

---

## Error: `AUTH_FAIL: OAuth token expired`

**What it means:** Your X OAuth token no longer works (very rare; tokens typically last 2+ years).

**Causes:**
- You manually revoked the app from X Settings → Apps and sessions
- Token naturally expired after ~2 years
- X account was suspended/locked

**Solutions:**

1. **Reconnect your X account:**
   ```bash
   /x-oauth-connect
   ```

2. **If X says "app not found":** The app may have been revoked from your X account:
   - Visit `https://x.com/settings/connected_apps`
   - Remove **MaxVision X Suite** if listed
   - Run `/x-oauth-connect` again

3. **If X account is locked:** Unlock it via X's account recovery flow, then re-run OAuth

---

## Error: `x_get_replies_tree` returns empty or "No results in 7-day window"

**What it means:** The tool can't find replies to a tweet.

**Causes:**
- Tweet is older than 7 days (Layer B limit)
- Tweet has no public replies
- Tweet is protected/deleted
- Rate limit: Layer B can only search the last 7 days of X's index

**Solutions for Free/Pro users:**

1. **Try a more recent tweet:**
   ```bash
   Ask Claude: Search for recent tweets from @username and get replies to the newest one
   ```

2. **Increase search scope manually:** Ask Claude to use `x_search_posts` with `lang:en` and a recent date range

**Solutions for self-hosted users (with Patchright enabled):**

3. **Enable the Patchright layer** in your server `.env`:
   ```bash
   PATCHRIGHT_ENABLED=true
   ```

4. **Restart Docker:**
   ```bash
   docker compose restart
   ```

5. **Re-run the tool** — Patchright can access older tweets (slower; uses browser automation)

---

## Error: `EXTERNAL_API_FAIL: X API 429` (rate limit)

**What it means:** You've exceeded the X API request limit for your tier.

**Causes:**
- Made too many requests in the current hour
- Rate limit is shared per API key (not per Claude Code session)
- Tier's hourly limit exceeded

**Solutions:**

1. **Check your tier:**
   ```bash
   /x-status
   ```

2. **Wait until the next hour** to continue (rate limits reset hourly)

3. **Upgrade to a higher tier** for more requests:
   - **Free:** 50 requests/hour
   - **Pro:** 300 requests/hour
   - **Agency:** 1,000 requests/hour
   - Upgrade at `https://x-api.produtoramaxvision.com.br/pricing.html`

4. **If you upgraded but still seeing 429:** Restart Claude Code to reload the new license key

---

## Error: `EXTERNAL_API_FAIL: X API 403` (forbidden)

**What it means:** The X API rejected your request due to missing authorization or insufficient permissions.

**Causes:**
- Trying a write operation without OAuth
- Trying a Pro/Agency tool with Free tier
- OAuth scope doesn't include the operation (rare)
- License key is wrong or expired

**Solutions:**

1. **If write operation:** Run `/x-oauth-connect`

2. **If Pro/Agency tool:** Verify your tier:
   ```bash
   /x-status
   ```

3. **If it shows Free but you're a Pro user:**
   - Verify license key is set: `echo $X_MAXVISION_LICENSE` (bash) or PowerShell equivalent
   - Ensure format: `MAXV-PRO-...` (Pro) or `MAXV-AGN-...` (Agency)
   - Restart Claude Code
   - Run `/x-status` again

4. **If error persists:** Email `produtoramaxvision@gmail.com` with:
   - Your API key (first 8 chars only, e.g., `mxv_abcd...`)
   - The tool name (e.g., `x_post_tweet`)
   - The error message

---

## Error: `x_post_tweet` returns preview but didn't actually post

**What it means:** The tool returned a preview of your tweet but it wasn't posted to X.

**Causes:**
- You forgot to use the `confirm: true` parameter
- Preview mode is enabled by default for safety
- API call succeeded but Claude didn't include confirmation

**Solutions:**

1. **Ask Claude explicitly to post (with confirmation):**
   ```bash
   Ask Claude: Post my tweet with confirm: true — "My message here"
   ```

2. **Or use the direct parameter:**
   ```bash
   Ask Claude: Use x_post_tweet with confirm=true and text="My message"
   ```

3. **Check X.com directly** to see if the tweet was posted (sometimes Claude's response is delayed)

For Pro/Agency users: once OAuth is connected, write operations should post immediately with `confirm: true`.

---

## Error: `CONFIG_FAIL: License key not recognized`

**What it means:** Your Pro or Agency license key isn't valid.

**Causes:**
- `X_MAXVISION_LICENSE` env var not set
- License key malformed (doesn't start with `MAXV-PRO-` or `MAXV-AGN-`)
- License key is for a different email than your API key
- License key expired

**Solutions:**

1. **Verify the license key is set:**
   ```powershell
   [Environment]::GetEnvironmentVariable("X_MAXVISION_LICENSE", "User")
   # Should output: MAXV-PRO-... or MAXV-AGN-...
   ```

2. **Check the format:**
   - Pro: `MAXV-PRO-<alphanumeric>`
   - Agency: `MAXV-AGN-<alphanumeric>`
   - If different format, you may have copied it incorrectly

3. **Restart Claude Code** (environment variables load at startup)

4. **Verify the tier:**
   ```bash
   /x-status
   # Should show: "Pro tier" or "Agency tier"
   ```

5. **If still failing:**
   - Log into `https://x-api.produtoramaxvision.com.br` and check your license status
   - Email `produtoramaxvision@gmail.com` with:
     - Your email address
     - API key (first 8 chars only)
     - License key (first 8 chars only)

---

## Self-host: Docker container won't start

**What it means:** `docker compose up` fails or the container crashes immediately.

**Most common cause:** `MASTER_KEY` in `.env` is wrong format.

**Solutions:**

1. **Generate a valid 64-character hex key:**
   ```bash
   openssl rand -hex 32
   # Output: a1b2c3d4e5f6... (64 hex chars)
   ```

2. **Update `.env`:**
   ```bash
   MASTER_KEY=a1b2c3d4e5f6...
   ```

3. **Restart containers:**
   ```bash
   docker compose restart
   ```

4. **Check logs:**
   ```bash
   docker compose logs -f
   ```

**Other common issues:**

- **PostgreSQL connection refused:**
  - Verify `DATABASE_URL` is correct
  - Ensure PostgreSQL is running: `docker compose ps` should show PostgreSQL container as "Up"
  - Test manually: `psql $DATABASE_URL -c "SELECT 1"`

- **Redis connection refused:**
  - Verify `REDIS_URL` is correct
  - Ensure Redis is running: `docker compose ps` should show Redis as "Up"

- **xAI API key invalid:**
  - Verify `XAI_API_KEY` format (should start with `xai_`)
  - Check account permissions on x.ai console

- **X API Bearer token invalid:**
  - Verify `X_API_BEARER_TOKEN` format (long alphanumeric string)
  - Check bearer token hasn't been revoked in X Developer Portal
  - For self-hosted, you need API v2 bearer token, not OAuth token

**Check server health:**
```bash
curl http://localhost:3000/mcp/health
# Should return: {"status":"ok"}
```

---

## Problemas comuns (pt-BR)

### `CONFIG_FAIL: X_MAXVISION_API_KEY unset`

**Problema:** Variável de ambiente não definida ou Claude Code não foi reiniciado.

**Solução:**
1. Verifique: `[Environment]::GetEnvironmentVariable("X_MAXVISION_API_KEY", "User")`
2. Se vazio, defina novamente via PowerShell (ver [guia de instalação](install.md))
3. **Reinicie Claude Code completamente**
4. Execute `/x-status`

### `AUTH_FAIL: No OAuth token for account "default"`

**Problema:** Tentou usar ferramenta de escrita sem autorizar conta X.

**Solução:** Execute `/x-oauth-connect` e siga o fluxo OAuth no navegador.

### `x_get_replies_tree` retorna vazio ou "No results in 7-day window"

**Problema:** Ferramenta só busca posts dos últimos 7 dias.

**Solução:** Procure por tweet mais recente ou upgrade para tier Pro/Agency e ative Patchright em self-hosted.

### `EXTERNAL_API_FAIL: X API 429`

**Problema:** Limite de taxa atingido (50 req/h Free, 300 req/h Pro, 1000 req/h Agency).

**Solução:** Aguarde próxima hora ou faça upgrade em `https://x-api.produtoramaxvision.com.br/pricing.html`.

### `EXTERNAL_API_FAIL: X API 403`

**Problema:** Falta autorização ou tier insuficiente.

**Solução:** 
1. Se escrita: execute `/x-oauth-connect`
2. Se Pro/Agency: verifique `/x-status` e reinicie Claude Code com license key

Mais detalhes e soluções avançadas: veja a versão em inglês acima.
