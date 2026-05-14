# Setup — Variante A (Claude Code only)

Plugin Claude Code + MCP server remoto (HTTP). Sem n8n.

## 1. Pré-requisitos

- Claude Code 2.x (CLI ou Desktop)
- API key MaxVision (`mxv_<48hex>`) — email `produtoramaxvision@gmail.com`
- (Pro/Agency) license key (`MAXV-X-PRO-<32hex>` ou `MAXV-X-AGENCY-<32hex>`)

## 2. Setup env

### Windows (PowerShell)

```powershell
[Environment]::SetEnvironmentVariable("MAXVISION_API_KEY", "mxv_xxxx", "User")
[Environment]::SetEnvironmentVariable("MAXVISION_LICENSE", "MAXV-X-PRO-...", "User")
```

Fechar e reabrir o terminal.

### macOS / Linux

```bash
echo 'export MAXVISION_API_KEY=mxv_xxxx' >> ~/.zshrc
echo 'export MAXVISION_LICENSE=MAXV-X-PRO-xxxx' >> ~/.zshrc
source ~/.zshrc
```

## 3. Instalar plugin

```bash
claude /plugin install produtoramaxvision/maxvision-x-mcp
```

Restart Claude Code.

## 4. Verify

```
/x-status
```

Esperado: confirma conexão MCP, versão, rate-limit, tier.

## 5. (Opcional) Cookie X para Layer D

Se quiser usar `x_get_replies_tree` ou tools que dependem de Patchright:

```
/x-cookie-refresh
```

Siga instruções para colar `auth_token` + `ct0` no endpoint `/admin/account-cookie`.

## 6. Uso

| Comando | Quando |
|---|---|
| `/x-search <query>` | Buscar posts (Grok) |
| `/x-profile @handle` | Analisar perfil |
| `/x-post <texto>` | Publicar tweet (Pro) |
| `/x-thread <topico>` | Publicar thread (Pro) |
| `/x-reply <tweet-id>` | Reply contextual (Pro) |
| `/x-trends <topico>` | Tendências |
| `/x-monitor @handle` | Monitorar menções |

## Troubleshooting

- **401 unauthorized**: API key ou license inválida. Confira env vars + restart.
- **429 rate_limited**: Rate-limit por tool. Espere ~1 min.
- **Cookie expired**: rode `/x-cookie-refresh` novamente.
- **License invalid**: license expirou ou foi revogada. Renove em `https://x.produtoramaxvision.com.br/pricing`.
