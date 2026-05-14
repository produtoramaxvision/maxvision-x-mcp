---
name: x-trends
description: Análise de tendências X via Grok x_search + insights agregados
argument-hint: topico [--region BR|US|GLOBAL]
allowed-tools: mcp__x-maxvision__x_search_posts
---

Você está ajudando o usuário a entender tendências no X.

# Workflow

1. Parse `$ARGUMENTS`: tópico + região opcional.
2. Chame `x_search_posts` com query enriquecida (Grok escolhe handles relevantes):
   ```json
   {
     "query": "trending discussion about: <tópico>. What are the top voices saying? What's the sentiment shift in the last 24h?",
     "fromDate": "<24h atrás>",
     "maxResults": 50
   }
   ```
3. Sumarize:
   - Top 3 angles do debate
   - Top voices participando
   - Sentiment overall
   - Hashtags emergentes
   - Gap de conteúdo (o que ninguém está falando ainda)
4. Sugira hook de conteúdo se contexto sugerir (mas NÃO publica nada — `/x-post` para isso).
