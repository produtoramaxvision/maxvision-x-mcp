# Secrets directory

Create the following files locally (DO NOT commit — `.gitignore` excludes `secrets/*.txt`).

## Required

| File | Description | How to generate |
|---|---|---|
| `master_key.txt` | 64-hex AES-256 key for cookie/token encryption | `openssl rand -hex 32` |
| `postgres_password.txt` | DB password | `openssl rand -hex 24` |
| `webhook_secret.txt` | Shared secret for /webhooks/* endpoints | `openssl rand -hex 32` |

## LLM provider (at least one)

| File | Description |
|---|---|
| `xai_api_key.txt` | xAI Grok API key — sign up at https://console.x.ai |
| `openrouter_api_key.txt` | OpenRouter — sign up at https://openrouter.ai/keys |

## X API v2 (writes — required for Pro tier)

| File | Description |
|---|---|
| `x_api_bearer.txt` | App-Only Bearer token from https://developer.x.com (read-only reads) |
| `x_api_client_secret.txt` | OAuth 2.0 Client Secret (user-context writes) |

## Apify (Layer C bulk reads — optional but recommended)

| File | Description |
|---|---|
| `apify_api_token.txt` | API token from https://console.apify.com/account/integrations |

## Quick start

```bash
cd mcp-server/docker
openssl rand -hex 32 > secrets/master_key.txt
openssl rand -hex 24 > secrets/postgres_password.txt
openssl rand -hex 32 > secrets/webhook_secret.txt
# paste your keys into the remaining files
docker compose up -d
```
