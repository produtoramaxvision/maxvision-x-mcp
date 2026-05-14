---
name: x-anti-detect-rules
description: "Use when configurar rate-limits, planejar janelas de execução para automação X via Patchright fallback (Layer D), ou interpretar captcha/HTTP 429 events. Define token-bucket caps, behavioral mimicry, playbook de recuperação."
---

# X Anti-Detect Rules — Patchright + cookie

Define limites operacionais para a camada D (Patchright + cookie `auth_token`).

## 1. Token bucket per-tool (server-side enforced)

| Tool | Capacity (burst) | Refill (tokens/s) | Equivalente |
|---|---|---|---|
| `x_search_posts` (Grok) | 30 | 0.5 | 30/min sustained |
| `x_get_post` | 30 | 0.5 | 30/min |
| `x_get_user_profile` | 20 | 0.3 | 18/min |
| `x_get_user_timeline` | 15 | 0.25 | 15/min |
| `x_get_followers` | 10 | 0.1 | 6/min |
| `x_get_replies_tree` | 10 | 0.15 | 9/min |
| `x_post_tweet` | 5 | 0.01 | 36/h, 5 burst |
| `x_reply` | 10 | 0.02 | 72/h |
| `x_quote_tweet` | 5 | 0.01 | 36/h |
| `x_like_unlike` | 20 | 0.1 | 360/h (X cap ~1k/dia) |
| `x_follow_unfollow` | 10 | 0.02 | 72/h (cap 30/dia recomendado) |
| `x_send_dm` | 5 | 0.01 | 36/h (cap 50/dia recomendado) |

## 2. Quiet hours

22:00–06:00 server local (TZ via env `TZ`).
- DM bloqueado server-side via `isQuietHours()` em `browser/anti-detect.ts`.
- Posts/replies permitidos mas com `randomDelay(3000, 8000)` extra.

## 3. Behavioral mimicry (Patchright)

Quando Layer D ativa:
- `randomDelay(1500, 4000)` entre ações.
- Mouse-movement humanização (Patchright handle nativo).
- Sem custom UA / viewport — Patchright fingerprint estável.
- Persistent context por `accountId` em `${PROFILE_BASE_DIR}/<accountId>`.

## 4. Detecção de captcha

Quando Patchright detecta `iframe[src*="arkose"]` ou `[data-testid="LoginForm_Login_Button"]`:
1. Log em `captcha_events` table.
2. Disable account (`accounts.status = 'captcha'`).
3. Notificar user via SSE `/events` ou n8n webhook.
4. User precisa re-renovar cookie via `/x-cookie-refresh`.

## 5. HTTP 429 recovery

Quando X API v2 (Layer B) retorna 429:
1. Backoff exponencial 2^n até 5min.
2. Switch para Layer A (Grok) se tool tem fallback.
3. Após 3 tentativas, surface erro ao user com `RATE_LIMITED` + retry_after.

## 6. Account health metrics

- Cookie expiry monitorado (`accounts.cookie_expires_at`).
- Last 24h: count de captcha_events + audit_log errors.
- Score 0-100 surfaceado em `/x-status`.
