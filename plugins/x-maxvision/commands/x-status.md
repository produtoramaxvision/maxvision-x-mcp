---
name: x-status
description: Health check do MCP server X — rate-limit, license, conta
allowed-tools: mcp__x-maxvision__x_get_user_profile
---

Você está verificando a saúde da conexão MCP X.

# Workflow

1. Chame `x_get_user_profile { username: "x" }` (handle oficial).
2. Se erro 401 → license inválida ou MAXVISION_API_KEY ausente; oriente como setar.
3. Se erro 429 → rate-limit; reporte quando voltar.
4. Se OK → reporte:
   - Versão MCP (extrair do `/health`)
   - Tier license (via header `X-MaxVision-License`)
   - Rate-limit remaining por tool (se exposto via /metrics)
   - Layer A/B/C/D status
