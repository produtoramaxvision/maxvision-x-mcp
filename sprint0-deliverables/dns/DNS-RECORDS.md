# DNS Records — Cloudflare zone `produtoramaxvision.com.br`

| Type | Name | Content | Proxy | Notes |
|---|---|---|---|---|
| CNAME | `x-api` | `<vps-ip-or-host>` | **DNS only** | Traefik HTTP-01 ACME — proxied breaks challenge |
| CNAME | `x` | `maxvision-x-landing.pages.dev` | Proxied | Cloudflare Pages |
| Worker route | — | `x-license.produtoramaxvision.com.br/v1/*` → `maxv-x-license` | n/a | Set via `wrangler.toml` |

## Provisioning script (manual ou via API)

Para criar via Cloudflare API:

```bash
# Set: ZONE_ID e CF_API_TOKEN (Edit DNS scope)
ZONE_ID="<zone_id>"
TOKEN="<cf_api_token>"

# CNAME x-api → VPS (DNS only)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "x-api",
    "content": "<vps-hostname>",
    "proxied": false
  }'

# CNAME x → CF Pages (proxied)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "x",
    "content": "maxvision-x-landing.pages.dev",
    "proxied": true
  }'
```
