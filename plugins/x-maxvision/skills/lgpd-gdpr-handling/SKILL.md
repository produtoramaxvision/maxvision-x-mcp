---
name: lgpd-gdpr-handling
description: "Use when projetar/operar features que tocam dado pessoal X — define o que é PII no contexto X, armazenamento, retenção, direitos do titular (LGPD art. 18 / GDPR), e o que devs MUST fazer em logs e prompts."
---

# LGPD / GDPR — handling de PII no plugin X Suite

## 1. O que é PII neste contexto

| Dado | Categoria |
|---|---|
| `auth_token` X cookie | **PII sensível** (acesso à conta) |
| `ct0` (CSRF) | Sensível |
| X user_id + username (público) | Público — não PII restrita |
| X profile bio + display_name (público) | Público |
| DMs (conteúdo) | **PII sensível** |
| Email do customer (Stripe) | PII |
| `licenseKey` | Secret tier |

## 2. O que NUNCA persistir em claro

- Cookies `auth_token` / `ct0` → AES-256-GCM em `accounts.cookie_encrypted`
- OAuth access/refresh tokens → AES-256-GCM em `oauth_tokens`
- DMs em texto → NÃO armazenar payload completo; só metadata em `engagements.payload` redacted
- Tweets gerados/enviados → armazenar apenas SHA-256 hash em `audit_log` (`inputHash`/`outputHash`)
- Email customer → armazenar só no Worker KV, não no MCP server

## 3. Retenção

- `audit_log`: 90 dias (truncate via cron Sprint 2)
- `posts_cache` / `users_cache`: TTL via `expires_at` — read tools setam 24h
- `engagements`: 365 dias (histórico ações user)
- `captcha_events`: 30 dias
- `oauth_tokens`: até refresh expirar; user pode deletar via `/admin/disconnect`

## 4. Direitos do titular (LGPD art. 18 / GDPR)

- **Acesso**: endpoint `/admin/export-my-data?accountId=X` retorna JSON com tudo associado.
- **Eliminação**: `/admin/delete-account?accountId=X` apaga rows + revoga license.
- **Portabilidade**: mesmo JSON do export.
- **Retificação**: edit via re-submit endpoints (cookie-refresh, oauth-callback).

## 5. Logs

- Pino `redact` configurado para: `auth_token`, `ct0`, `accessToken`, `refreshToken`, `apiKey`, `licenseKey`, `MASTER_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`, `X_API_BEARER_TOKEN`, `STRIPE_SECRET_KEY`.

## 6. Compartilhamento com terceiros

- **xAI**: prompts vão para xAI quando user usa Grok x_search. Disclosure: "via xAI Grok".
- **OpenRouter**: passthrough quando `LLM_PROVIDER=openrouter`. Disclosure: "via OpenRouter".
- **Apify**: queries de bulk read passam para Apify. Disclosure: "via Apify".
- **Stripe**: dados de billing — fora do nosso domínio de tratamento.
- **NUNCA** compartilhar PII X de terceiros (followers list, etc) com nenhum LLM provider sem opt-in explícito do user.

## 7. Base legal

- Cookie/oauth do user: consentimento explícito (via /x-cookie-refresh flow).
- Stripe billing: contrato (assinatura).
- Audit logs: legítimo interesse + obrigação legal (compliance/fraud).
