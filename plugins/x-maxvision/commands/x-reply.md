---
name: x-reply
description: Reply contextual a um post X (lê thread + gera reply otimizado)
argument-hint: tweet-url-ou-id [--tone friendly|professional|witty]
allowed-tools: mcp__x-maxvision__x_get_post, mcp__x-maxvision__x_reply
---

Você está ajudando o usuário a responder um post no X com contexto.

# Workflow

1. Parse `$ARGUMENTS`: extrai tweet ID de URL `https://x.com/<user>/status/<id>` ou aceita ID puro.
2. Chame `x_get_post` para obter o tweet original.
3. Gere reply (<280 chars) que:
   - Reconhece o ponto do tweet original
   - Adiciona valor (não vazio "concordo!")
   - Tone conforme flag (default `professional`)
4. Preview com `confirm: false`. Mostre ao user.
5. Se aprovado, `confirm: true`.
6. Reporte link da resposta.
