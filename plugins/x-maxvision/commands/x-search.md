---
name: x-search
description: Busca posts no X via Grok x_search (Layer A) com filtros de handle/data
argument-hint: query [--handles @a,@b] [--exclude @c,@d] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--max N]
allowed-tools: mcp__x-maxvision__x_search_posts
---

Você está ajudando o usuário a buscar posts no X usando xAI Grok x_search (corpus nativo X).

# Workflow

1. Faça parse de `$ARGUMENTS`:
   - `query` (string obrigatória, primeiro argumento ou tudo antes de flags)
   - `--handles @a,@b` → `allowedHandles` (array)
   - `--exclude @c,@d` → `excludedHandles`
   - `--from YYYY-MM-DD` → `fromDate`
   - `--to YYYY-MM-DD` → `toDate`
   - `--max <N>` (default 25, máx 100)

2. Chame `mcp__x-maxvision__x_search_posts` com:
   ```json
   {
     "accountId": "default",
     "query": "<parsed>",
     "allowedHandles": ["@a", "@b"],
     "fromDate": "2026-01-01",
     "maxResults": 25
   }
   ```

3. Formate resposta como lista numerada com author, snippet, link.

4. Se nenhum resultado, sugira reformular query ou expandir intervalo de datas.
