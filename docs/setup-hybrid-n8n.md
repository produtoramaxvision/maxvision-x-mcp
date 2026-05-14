# Setup — Variante B (Hybrid Claude Code + n8n)

Para automações cron-based, batch e tracking visual.

## Componentes

1. **Claude Code + plugin** (Variante A — siga setup-claude-code-only primeiro)
2. **n8n self-hosted** (sua infra) com webhook endpoints
3. **MCP server** com `ENABLE_WEBHOOKS=true` + `WEBHOOK_SECRET` setado

## Fluxo

```
n8n cron → POST /webhooks/* (X MCP server) ─┬─► MCP tool execution
                                            ├─► audit_log
                                            └─► SSE /events ──► n8n consumer
                                                  (real-time fanout)
```

## 1. n8n setup

- Self-host via Docker:
  ```bash
  docker run -d --name n8n \
    -p 5678:5678 \
    -v n8n_data:/home/node/.n8n \
    docker.n8n.io/n8nio/n8n
  ```

## 2. Workflows sugeridos (próxima sprint — Sprint 2)

- `x-daily-trends-scan` — cron daily 09:00, `/x-trends` por tópico, post sumário em Slack
- `x-mention-monitor` — cron 30min, `/x-monitor`, alerta replies hostis
- `x-content-pipeline` — webhook recebe rascunho, gera draft via `x-content-creator`, espera aprovação humana, publica
- `x-engagement-track` — receber `engagements` via SSE, dashboard métrica

(Workflows ainda não shipped — adicionar em `plugins/x-maxvision/n8n-workflows/` na Sprint 2.)

## 3. Webhook secret

No MCP server `.env`:
```
WEBHOOK_SECRET=<openssl rand -hex 32>
ENABLE_WEBHOOKS=true
```

No n8n HTTP Request node:
- Header `x-webhook-secret: <secret>`

## 4. SSE consumer (n8n)

n8n HTTP Streaming Request node em loop com `keep-alive`. Eventos:
- `connected` — handshake
- `heartbeat` — every 30s
- `tool_event` (Sprint 5.2) — após cada tool execution

## 5. Não-objetivos

n8n não substitui o plugin Claude Code — é orquestração externa. Toda lógica de geração de conteúdo, decisões de gate, e revisão humana fica no Claude Code.
