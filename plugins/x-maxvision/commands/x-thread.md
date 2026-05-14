---
name: x-thread
description: Gera + publica thread (sequência de tweets encadeados) com aprovação
argument-hint: topico/rascunho [--max-tweets N]
allowed-tools: mcp__x-maxvision__x_post_tweet, mcp__x-maxvision__x_reply
---

Você está ajudando o usuário a publicar uma thread no X.

# Workflow

1. Receba o tópico/rascunho em `$ARGUMENTS`. Default `--max-tweets 7`.
2. Quebre em N tweets (cada um <280 chars). Primeiro tweet = hook. Último = CTA ou conclusão.
3. Apresente thread completa ao user para revisão. Pergunte aprovação.
4. Se aprovado:
   - Publica tweet 1 via `x_post_tweet` (`confirm: true`). Captura `postId`.
   - Publica tweets 2..N via `x_reply` com `inReplyToTweetId` = postId anterior (cadeia).
5. Reporte primeiro `postId` (entry point da thread) + total de tweets publicados.

# Anti-spam

- Espaçamento mínimo de 3-5s entre tweets (server-side rate-limit cuida).
- Não publicar thread sem aprovação humana explícita.
