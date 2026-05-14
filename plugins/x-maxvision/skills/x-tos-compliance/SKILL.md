---
name: x-tos-compliance
description: "Use when planejar ou executar qualquer interação com X — search, post, reply, DM, follow, scrape — para validar que a ação respeita X Developer Agreement, Automation Rules e Restricted Use Cases."
---

# X (Twitter) ToS Compliance — guia operacional

Define o que pode/não pode pelo plugin `x-maxvision`. Em dúvida, recuse e explique.

> **Fontes públicas (verify before quoting):**
> - X Developer Agreement: https://developer.x.com/en/developer-terms/agreement
> - X Policy: https://help.x.com/en/rules-and-policies
> - Automation Rules: https://help.x.com/en/rules-and-policies/x-automation
> - Restricted Use Cases: https://developer.x.com/en/developer-terms/restricted-use-cases

## 1. Proibido (operacional)

X Automation Rules + Developer Agreement (resumo):

1. **Mass-following / mass-unfollowing** (aggressive churn) — banido.
2. **Aggressive following** (>400 follows/dia) — banido.
3. **Repetitive posting** do mesmo conteúdo em alta cadência — banido.
4. **Spam DMs** (recipient não-mutualmente seguindo) — banido.
5. **Automation que mimetize humano** (gera ilusão de pessoa real) — banido.
6. **Coordenação inautêntica** (várias contas atuando como uma) — banido.
7. **Manipulação eleitoral** ou desinformação política coordenada — banido.
8. **Scraping em escala via UI** sem cookies próprios autenticados — viola ToS.
9. **Captcha bypass** automatizado — viola ToS.
10. **Re-share de dados de usuários para terceiros** sem consentimento — banido.

## 2. Permitido com cuidado

- **Automation própria com aprovação humana por ação write** (`confirm: true` obrigatório).
- **Search/read em dados públicos** via Grok x_search (Layer A — não toca infra X) ou X API v2 (Layer B — sob ToS).
- **Cookie auth_token próprio** apenas para leitura de conteúdo bloqueado por login (replies-tree, DMs próprias).
- **Rate-limits conservadores** (server-side enforced).
- **Disclosure de automação** quando publicar a partir de bot (X exige label "Automated by @user" via `bot.appropriate_disclosure`).

## 3. Tools que precisam de scrutiny especial

| Tool | Risco | Mitigação |
|---|---|---|
| `x_post_tweet` | Spam, misinformation | Sempre `confirm: true` + revisão human |
| `x_reply` | Reply spam | Rate-limit + revisão |
| `x_send_dm` | DM spam = instant ban | Agency tier + recipient deve seguir o sender (mutualidade) |
| `x_follow_unfollow` | Mass-follow ban | Cap 30/dia + quiet hours + não mesmo-dia follow+unfollow |
| `x_search_posts` (Grok) | Baixo (corpus xAI) | OK |
| `x_get_replies_tree` (Apify) | Médio (scrape) | OK se Apify mantém compliance |

## 4. Resposta padrão quando user pede ação proibida

```
Esta ação viola X Developer Agreement (seção <X>) — não posso executá-la.
Alternativa: <sugestão ToS-safe>.
Referência: <url ToS>.
```

## 5. Disclosure obrigatória

Quando publicar via bot, incluir contexto "powered by MaxVision X Suite" se contexto de marca exigir,
e usar `bot.appropriate_disclosure` no `x_post_tweet` v0.2+ quando API expor.
