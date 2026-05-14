# Sprint 1 — MaxVision X (Twitter) Suite

> Design 4-layer + 16 tools v0.1 (cobertura X completa fasada em 3 sprints; total 32 tools).
> Referência: `maxvision-linkedin-mcp-git/` v0.1.0.

## Stack

- Node 20 LTS · TypeScript strict · `type: module`
- Hono + `@modelcontextprotocol/sdk` 1.x (stdio + StreamableHTTP transport)
- Drizzle ORM + node-postgres
- Postgres 16 · Redis 7 (token bucket)
- Patchright (browser pool, persistent contexts por accountId)
- Zod (schemas), Pino (logs), Vitest (tests)
- Cifra AES-256-GCM para cookies `auth_token` (IV 12 + Tag 16 + CT)

## Arquitetura 4-layer

| Layer | Fonte | Custo | Uso |
|---|---|---|---|
| **A** | xAI Grok `x_search` (via `LlmProvider` — Grok direto OU OpenRouter) | $0.005/call | Reads agregados (search, profile insights, activity) |
| **B** | X API v2 pay-per-use OAuth 2.0 PKCE user-context | $0.001-0.01/op | Writes obrigatórios + reads cirúrgicos |
| **C** | Apify apidojo Tweet Scraper V2 | $0.25/1k tweets | Bulk reads (>1k) sob demand |
| **D** | Patchright + cookie `auth_token` | infra-only | Fallback gated ToS-grey (replies-tree, DMs históricas, Spaces) |

## 16 tools v0.1

### Read (10)
| # | Tool | Layer |
|---|---|---|
| 1 | `x_search_posts` | A |
| 2 | `x_search_users` | B + A fallback |
| 3 | `x_get_post` | B |
| 4 | `x_get_user_profile` | B |
| 5 | `x_get_user_timeline` | B |
| 6 | `x_get_followers` | B |
| 7 | `x_get_following` | B |
| 8 | `x_get_replies_tree` | C + D |
| 9 | `x_post_metrics` | B |
| 10 | `x_profile_activity` | A |

### Write (6) — todas requer Pro license + OAuth user-context
| # | Tool | Layer | Tier |
|---|---|---|---|
| 11 | `x_post_tweet` | B | Pro |
| 12 | `x_reply` | B | Pro |
| 13 | `x_quote_tweet` | B | Pro |
| 14 | `x_like_unlike` | B | Pro |
| 15 | `x_follow_unfollow` | B | Pro |
| 16 | `x_send_dm` | B (Basic OAuth) | Agency |

## Pricing tiers

| Tier | $/mês | Quota | Tools |
|---|---|---|---|
| Free | $0 | 100 reads/mês (Grok) | Read-only Sprint 1 |
| Pro | USD 29 | 1k reads + 100 writes | Sprint 1 read+write |
| Agency | USD 99 | 10k reads + 1k writes + DMs | Sprint 1+2 |
| Ads | USD 199 | + X Ads API | Sprint 3 |

## DNS / domínios

- `x-api.produtoramaxvision.com.br` — MCP server HTTP (VPS Traefik)
- `x.produtoramaxvision.com.br` — landing (Cloudflare Pages)
- `x-license.produtoramaxvision.com.br` — Cloudflare Worker (Stripe webhook + license check)

## Repos GitHub

- `produtoramaxvision/maxvision-x-mcp` (público — AGPL-3.0)
- `produtoramaxvision/maxvision-x-mcp-pro` (privado — EULA proprietária)

## Layout (paridade LinkedIn)

```
maxvision-x-mcp-git/
├── mcp-server/
│   ├── package.json, tsconfig.json, drizzle.config.ts, vitest.config.ts
│   ├── src/
│   │   ├── server.ts (entry: stdio | http)
│   │   ├── http.ts (Hono: /health /metrics /mcp /admin/account-cookie /webhooks /events)
│   │   ├── env.ts, logger.ts, errors.ts, version.ts
│   │   ├── auth/ (api-key, cookies, license, llm-provider, request-context)
│   │   ├── db/ (client, schema, repos/)
│   │   ├── rate-limit/ (strategy, token-bucket)
│   │   ├── grok/ (client x_search; openrouter-passthrough)
│   │   ├── x-api/ (oauth2-pkce, v2-client)
│   │   ├── scrapers/ (apify-x)
│   │   ├── browser/ (pool Patchright, anti-detect, context, content-extract)
│   │   └── tools/ (_base, _registry, schemas + 16 tool files)
│   ├── docker/ (Dockerfile, docker-compose.yml, docker-stack.yml, postgres/init.sql, secrets/)
│   ├── drizzle/ (migrations)
│   └── scripts/ (capture-cookie, oauth-callback-helper)
├── plugins/x-maxvision/
│   ├── .claude-plugin/plugin.json
│   ├── commands/ (8: x-search, x-post, x-thread, x-reply, x-profile, x-monitor, x-trends, x-cookie-refresh)
│   ├── agents/ (4: content-creator, engagement-monitor, growth-strategist, trend-analyst)
│   ├── skills/ (5: x-tos-compliance, x-anti-detect-rules, x-content-strategy, x-engagement-playbook, lgpd-gdpr)
│   ├── hooks/ (session-start, pre-tool-use, post-tool-use)
│   └── README.md
├── workers/license/ (Cloudflare Worker: /v1/check /v1/issue /v1/revoke /v1/license-by-session)
├── landing/ (CF Pages: index.html pricing.html thanks.html + functions/)
├── sprint0-deliverables/ (stripe SKUs, dns, github-actions, portainer, scripts)
├── .github/workflows/ (ci.yml, release.yml, landing-deploy.yml)
├── docs/ (ARCHITECTURE.md, ROADMAP.md, etc — copia do blueprint -mcp/)
├── blueprints/
├── README.md, CHANGELOG.md, LICENSE
```

## Sprint 1 entregáveis (sessão atual)

- [x] Scaffold directory structure
- [x] PLAN-SPRINT1.md (este arquivo)
- [x] mcp-server: package.json, configs, src/* (env/logger/errors/version/server/http)
- [x] mcp-server: auth (api-key, cookies, license, llm-provider, request-context)
- [x] mcp-server: db (client, schema com posts_cache/users_cache/accounts/audit_log)
- [x] mcp-server: rate-limit (strategy, token-bucket)
- [x] mcp-server: grok (client x_search)
- [x] mcp-server: x-api (oauth2 + v2-client)
- [x] mcp-server: scrapers (apify-x)
- [x] mcp-server: browser (pool, anti-detect)
- [x] mcp-server: tools (_base, _registry, schemas + 16 tools)
- [x] mcp-server/docker (Dockerfile, compose, init.sql)
- [x] workers/license/ clone+adapt
- [x] landing/ (index, pricing, thanks)
- [x] plugins/x-maxvision/ (plugin.json + 9 commands + 4 agents + 5 skills + 3 hooks)
- [x] sprint0-deliverables stubs
- [x] .github/workflows/ (ci.yml, release.yml, landing-deploy.yml)
- [x] README.md raiz
- [x] commit inicial v0.1.0 (37c1216)
- [x] CF DNS records (x-api, x, x-license) — via mcp__cloudflare__execute 2026-05-14
- [x] CF KV namespace `maxv-x-licenses` (id `1c6920100ae34f21b808d980e59373e9`)
- [x] CF Pages project `maxvision-x-landing`
- [x] Stripe test products + prices + payment links — Pro `prod_UWBIGBOgryN2A2` ($29), Agency `prod_UWBI8E0wu0JcsX` ($99)
- [x] Portainer stack X reescrita (paridade LinkedIn deployed — net externa, certresolver letsencryptresolver, x_* prefix)
- [ ] gh repo create (BLOQUEADO — gh token inválido + api.github.com timeout)
- [ ] git push -u origin main (depende repo create)
- [ ] Custom Domain ativar no CF Pages `maxvision-x-landing` (UI)
- [ ] Stripe webhook → x-license/v1/issue (depende deploy Worker)
- [ ] `wrangler login` + Worker secrets + deploy
