# Stripe Products Setup — MaxVision X Suite

## Products to create (dashboard manual ou via CLI `stripe products create`)

### Pro tier

- **Name**: MaxVision X Suite — Pro
- **Description**: 15 X automation tools (read + write). 1k reads + 100 writes/mês.
- **Price**: USD 29 / mês (recurring)
- **Lookup key**: `x_pro_monthly`
- **Metadata**: `tier=pro`, `product=maxvision-x-mcp`

### Agency tier

- **Name**: MaxVision X Suite — Agency
- **Description**: Todos 16 X tools (inclui DMs). 10k reads + 1k writes/mês. Multi-account pool.
- **Price**: USD 99 / mês (recurring)
- **Lookup key**: `x_agency_monthly`
- **Metadata**: `tier=agency`, `product=maxvision-x-mcp`

### Annual variants (recomendado — desconto 20%)

- Pro Yearly: USD 278 (10% desc) → lookup_key `x_pro_yearly`
- Agency Yearly: USD 948 (20% desc) → lookup_key `x_agency_yearly`

## Webhook

- **Endpoint URL**: `https://x-license.produtoramaxvision.com.br/v1/issue`
- **Events**:
  - `checkout.session.completed` (emite license)
  - `customer.subscription.deleted` (revoga license — TODO Sprint 2)
  - `customer.subscription.updated` (upgrade Pro→Agency atualiza tier)
- **Signing secret**: copiar do dashboard → `wrangler secret put STRIPE_WEBHOOK_SECRET --name maxv-x-license`

## Payment Links

Após criar products, gerar Payment Links e atualizar:
- `landing/pricing.html` linhas:
  - `<a href="https://buy.stripe.com/REPLACE_PRO_LINK">Assinar Pro</a>`
  - `<a href="https://buy.stripe.com/REPLACE_AGENCY_LINK">Assinar Agency</a>`

Configurar `success_url=https://x.produtoramaxvision.com.br/thanks.html?session_id={CHECKOUT_SESSION_ID}` em ambos.

## Customer Portal

Habilitar portal para self-service cancellation:
```
stripe billing_portal configurations update --features.subscription_cancel.enabled=true
```

URL → adicionar em footer da landing.
