---
name: x-cookie-refresh
description: Captura cookie auth_token X via browser local + persiste no servidor MCP
---

Você está orientando o usuário a renovar o cookie `auth_token` para automação X via Patchright fallback (Layer D).

# Workflow

1. Avisar o user que o cookie expira ~30 dias e precisa renovação periódica.
2. Instruir captura manual:
   - Abrir https://x.com no navegador
   - Login normal
   - DevTools (F12) → Application → Cookies → x.com
   - Copiar valores: `auth_token`, `ct0`, `guest_id`
3. Enviar para o MCP server via POST `/admin/account-cookie`:
   ```bash
   curl -X POST https://x-api.produtoramaxvision.com.br/admin/account-cookie \
     -H "Authorization: Bearer $X_MAXVISION_API_KEY" \
     -H "content-type: application/json" \
     -d '{
       "accountId": "default",
       "displayName": "Sua conta",
       "cookies": [
         { "name": "auth_token", "value": "...", "domain": ".x.com" },
         { "name": "ct0", "value": "...", "domain": ".x.com" }
       ],
       "expiresInDays": 30
     }'
   ```
4. Reportar `accountId` + `expiresAt`.

# Compliance

- Cookie permanece criptografado AES-256-GCM no Postgres do server.
- Nunca compartilhe seu `auth_token` com terceiros.
- Cookie comprometido = revogue imediatamente fazendo logout de "All Sessions" no X.
