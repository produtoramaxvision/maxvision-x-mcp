# Sprint 0 deliverables — MaxVision X Suite

Status dos artefatos não-código necessários para shipping v0.1.0.

## Marketplace / GitHub

- [ ] **Repo público** — `produtoramaxvision/maxvision-x-mcp` (BLOQUEADO 2026-05-14: gh token revogado + rede instável vs api.github.com — user precisa rodar `gh auth login -h github.com`)
- [ ] **Repo privado** — `produtoramaxvision/maxvision-x-mcp-pro` (idem)
- [ ] **Branch protection** — main: 1-review; homolog: 2 status checks
- [ ] **GHCR habilitado** — auto-publish via CI `GITHUB_TOKEN`
- [ ] **Issue templates** — `.github/ISSUE_TEMPLATE/{bug,feature,compliance}.yml`

## DNS (zone `produtoramaxvision.com.br`) ✓

Criado 2026-05-14 via mcp__cloudflare__execute:

- [x] **CNAME `x-api`** → `oracle.produtoramaxvision.com.br` (DNS only) — id `c50ccde8689f703713bffba4e43831b2`
- [x] **CNAME `x`** → `maxvision-x-landing.pages.dev` (proxied) — id `3daedadd377191abce65f2c5c1b274eb`
- [x] **AAAA `x-license`** → `100::` (proxied, Worker route) — id `6f14a8fa8c0947e00c827f1ae0f07f97`

See [dns/DNS-RECORDS.md](dns/DNS-RECORDS.md).

## Stripe (test mode — sk_test_*) ✓

Criado 2026-05-14 via mcp__stripe-mcp:

- [x] **Product Pro** — `prod_UWBIGBOgryN2A2` · Price `price_1TX8vcDUMJkQwpuNIXSbSJTU` ($29/mês recurring)
- [x] **Product Agency** — `prod_UWBI8E0wu0JcsX` · Price `price_1TX8vgDUMJkQwpuNAqusf30y` ($99/mês recurring)
- [x] **Payment Link Pro** — `https://buy.stripe.com/test_9B69AT09FgJv71Fds3es000`
- [x] **Payment Link Agency** — `https://buy.stripe.com/test_6oU8wPe0vdxjbhV5ZBes001`
- [ ] **Webhook endpoint** → `https://x-license.produtoramaxvision.com.br/v1/issue` (Stripe dashboard depois deploy Worker)
- [ ] **Live mode** — migrar test → live quando validado

## Cloudflare Worker license

- [x] **KV namespace** `maxv-x-licenses` — id `1c6920100ae34f21b808d980e59373e9` (já atualizado em `workers/license/wrangler.toml`)
- [ ] **Secrets** — `wrangler secret put STRIPE_WEBHOOK_SECRET/STRIPE_SECRET_KEY/ADMIN_TOKEN` (depende user `wrangler login`)
- [ ] **Deploy** — `cd workers/license && pnpm deploy`

## Portainer stack ✓

- [x] **Stack pré-preenchido** — `portainer/portainer-stack-x.yml` (paridade LinkedIn deployed: network `net`, certresolver `letsencryptresolver`, service prefix `x_*`, 3 services Swarm-ready)
- [x] **YAML validado** — 3 services, 3 volumes, 18 env vars referenciadas, Traefik labels OK
- [x] **Env vars inline** — `${VAR}` substituição via Portainer environment UI (paridade LinkedIn `portainer-stack-vmmvp.yml`)

## Landing CF Pages

- [x] **Project created** — `maxvision-x-landing` (subdomain `maxvision-x-landing.pages.dev`)
- [ ] **Custom domain** — `x.produtoramaxvision.com.br` em CF dashboard (DNS já aponta, só ativar Custom Domain no Pages UI)
- [ ] **Resend audience id** — env `RESEND_AUDIENCE_ID` para waitlist
- [ ] **Deploy** — `cd landing && pnpm deploy`

## Setup scripts

- [x] **00-vps-prereqs.sh** — Docker + Traefik network
- [x] **01-clone-deploy.sh** — clone + compose up
- [ ] **02-rotate-secrets.sh** — rotacionar MASTER_KEY/cookies
- [ ] **03-gh-secrets.sh** — provisionar GH Actions secrets

See [scripts/](scripts/).
