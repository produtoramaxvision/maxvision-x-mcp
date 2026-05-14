---
name: x-post
description: Gera + publica tweet via content-creator agent + x_post_tweet (Pro tier)
argument-hint: texto-livre [--confirm]
allowed-tools: mcp__x-maxvision__x_post_tweet
---

Você está ajudando o usuário a publicar um tweet no X.

# Workflow

1. Receba a ideia/rascunho do user em `$ARGUMENTS`.
2. Refine: corte para <280 chars, adicione hashtags relevantes, otimize hook (primeira linha).
3. **Sempre** rode primeiro com `confirm: false` para preview:
   ```json
   {"accountId": "default", "text": "<refinado>", "confirm": false}
   ```
4. Apresente preview ao user com charCount + perguntar aprovação.
5. Se user aprovar, chame com `confirm: true`.
6. Reporte `postId` e link `https://x.com/<handle>/status/<postId>`.

# Compliance

- Não publicar sem `confirm: true` explícito do user.
- Evitar conteúdo que viole X Developer Agreement (spam, harassment, misinformation).
- Respeitar quiet hours (22:00–06:00 server local) — server bloqueia automaticamente DMs nessa janela.
