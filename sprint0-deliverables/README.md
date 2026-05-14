# Sprint 0 deliverables — MaxVision X Suite

Status dos artefatos não-código necessários para shipping v0.1.0.

## Marketplace / GitHub

- [ ] **Repo público** — `produtoramaxvision/maxvision-x-mcp` (será criado via `gh repo create`)
- [ ] **Repo privado** — `produtoramaxvision/maxvision-x-mcp-pro` (criar)
- [ ] **Branch protection** — main: 1-review; homolog: 2 status checks
- [ ] **GHCR habilitado** — auto-publish via CI `GITHUB_TOKEN` (CI já configurado em `.github/workflows/ci.yml`)
- [ ] **Issue templates** — `.github/ISSUE_TEMPLATE/{bug,feature,compliance}.yml` (TODO)

## DNS (Cloudflare zone `produtoramaxvision.com.br`)

- [ ] **CNAME `x-api`** → VPS Traefik (DNS only, no proxy — Traefik HTTP-01)
- [ ] **CNAME `x`** → Cloudflare Pages `maxvision-x-landing` (proxied)
- [ ] **Worker route `x-license.produtoramaxvision.com.br`** → bound via wrangler.toml

See [dns/DNS-RECORDS.md](dns/DNS-RECORDS.md).

## Stripe

- [ ] **Products** — Pro + Agency (manual setup, ver `stripe/PRODUCTS-SETUP.md`)
- [ ] **Webhook endpoint** → `https://x-license.produtoramaxvision.com.br/v1/issue`
- [ ] **Payment Links** — pegar do dashboard e atualizar `landing/pricing.html`

See [stripe/PRODUCTS-SETUP.md](stripe/PRODUCTS-SETUP.md).

## Cloudflare Worker license

- [ ] **KV namespace** — `wrangler kv:namespace create maxv-x-licenses` → update id em `workers/license/wrangler.toml`
- [ ] **Secrets** — STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, ADMIN_TOKEN via `wrangler secret put`
- [ ] **Deploy** — `cd workers/license && pnpm deploy`

## Portainer stack

- [ ] **Stack template** — `portainer/portainer-stack-x.yml`
- [ ] **Secrets template** — `portainer/.env.template`

## Landing CF Pages

- [ ] **Project created** — `wrangler pages project create maxvision-x-landing`
- [ ] **Custom domain** — `x.produtoramaxvision.com.br` em CF dashboard
- [ ] **Resend audience id** — env `RESEND_AUDIENCE_ID` para waitlist

## Setup scripts

- [ ] **00-vps-prereqs.sh** — instalar Docker / Traefik / criar `traefik-public` network
- [ ] **01-clone-deploy.sh** — pull repo + docker compose up
- [ ] **02-rotate-secrets.sh** — rotacionar MASTER_KEY/cookies sob demand
- [ ] **03-gh-secrets.sh** — provisionar GH Actions secrets (CLOUDFLARE_API_TOKEN, etc)

See [scripts/](scripts/).
