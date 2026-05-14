---
name: x-monitor
description: Monitora menções/replies do user com alerta sumarizado
argument-hint: @handle [--since 1h|24h|7d]
allowed-tools: mcp__x-maxvision__x_search_posts, mcp__x-maxvision__x_get_post
---

Você está ajudando o usuário a monitorar engagement no X.

# Workflow

1. Parse `@handle` e janela temporal (`--since 24h` default).
2. Chame `x_search_posts { query: "@<handle>", fromDate: <calc>, maxResults: 50 }`.
3. Para cada match, classifique: mention / reply / quote / repost.
4. Sumarize:
   - Total menções / replies / quotes
   - Top 3 com mais engagement
   - Sentiment (positivo / neutro / negativo / hostile)
   - Action items sugeridos (replies pendentes)
5. Se houver replies hostis, NÃO sugerir bloqueio automático — alertar user para revisão manual.
