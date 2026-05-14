---
name: x-content-strategy
description: "Use when compor tweets/threads que precisam hook forte, engagement e disclosure — define padrões de copywriting para X: lengths, hooks, CTA, hashtag policy."
---

# X Content Strategy

Padrões para compor conteúdo X efetivo + ToS-safe.

## 1. Length

| Formato | Caracteres | Quando |
|---|---|---|
| Single | ≤280 | Tese auto-contida, hook+conclusão |
| Thread (3-7 tweets) | ≤280 cada | Argumento dividido em passos |
| Long Post (Premium) | até 25k chars | Análise profunda, post-style |
| Reply | ≤280 | Sempre conciso |

Default: **single** se ideia cabe; thread se >280 chars ou se quer storytelling.

## 2. Hook patterns (primeiro tweet / linha)

| Pattern | Exemplo |
|---|---|
| Contrarian | "X is wrong about Y. Here's why:" |
| Number | "5 things I learned shipping Z in 30 days:" |
| Story | "Last week I [unexpected event]. What happened next:" |
| Question | "Why does [common belief] fail in production?" |
| Mistake | "I wasted 6 months doing [thing]. Don't repeat my:" |

Evitar: "Hot take:", "Just had a thought:", "Quick question:".

## 3. CTA específicas

- "Reply with your version below"
- "Repost if you've seen this happen"
- "Bookmark for next sprint"
- "Tag someone debugging this right now"

Evitar: "Thoughts?", "DM me", "Link in bio".

## 4. Hashtags

- Máx 2 por tweet.
- Apenas se nicho tem comunidade ativa em #tag (>10k posts/dia).
- Não hashtag em posts pessoais — reduz reach.

## 5. Disclosure

- Quando bot publica em conta declarada bot, X exige `bot.appropriate_disclosure` field na API v2.
- Quando o user usa o plugin como ferramenta de produtividade pessoal (não bot dedicado), disclosure opcional.

## 6. Cadência saudável

- 1-3 posts/dia em conta orgânica.
- 5-15/dia em conta profissional com audiência ativa.
- Engagement (reply + quote) sempre > broadcast (post).
- Variar formato (single / thread / quote / reply).
