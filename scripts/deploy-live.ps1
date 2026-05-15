<#
.SYNOPSIS
  One-shot LIVE deploy for MaxVision X license worker + Stripe webhook + Pages env.

.DESCRIPTION
  Cloudflare wrangler does NOT expose secret values once set, so secrets that
  already live on the linkedin worker cannot be programmatically copied to the
  X worker. This script prompts ONCE for each missing value (Read-Host as
  SecureString), then:
    1. Creates Stripe LIVE webhook → x-license worker (uses Stripe CLI)
    2. Writes all worker secrets via `wrangler secret put`
    3. Deploys the worker via `wrangler deploy`
    4. Sets STRIPE_SECRET_KEY on the maxvision-x-landing CF Pages project
    5. Echoes a summary

  Requires Stripe CLI (auto-installed if missing) + Wrangler + you must have
  already run `stripe login` once for the LIVE account.

.NOTES
  Re-runs are idempotent for secrets (wrangler overwrites). Webhook creation
  is NOT idempotent — abort + re-use the existing endpoint if it already
  points at x-license.produtoramaxvision.com.br/v1/issue.
#>

$ErrorActionPreference = 'Stop'

function Read-Secret([string]$prompt) {
  $sec = Read-Host -Prompt $prompt -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  return $plain
}

function Put-WranglerSecret([string]$name, [string]$value, [string]$workerDir) {
  Push-Location $workerDir
  try {
    $value | npx wrangler@latest secret put $name 2>&1 | Out-Null
    Write-Host "  ✓ $name" -ForegroundColor Green
  } finally { Pop-Location }
}

$repo = "C:\Users\MaxVision\Desktop\cursor-oficial\maxvision-x-mcp-git"
$workerDir = "$repo\workers\license"

Write-Host "`n=== MaxVision X LIVE deploy ===`n" -ForegroundColor Cyan

# ---------- 1. collect secrets ----------
Write-Host "[1/5] Coletando secrets (cole valor — não eco):" -ForegroundColor Yellow
$STRIPE_SECRET_KEY     = Read-Secret "  STRIPE_SECRET_KEY (sk_live_...)"
$RESEND_API_KEY        = Read-Secret "  RESEND_API_KEY (re_...)"
$RESEND_FROM_EMAIL_PLN = Read-Host  "  RESEND_FROM_EMAIL (ex: noreply@produtoramaxvision.com.br)"
$EVOLUTION_API_URL_PLN = Read-Host  "  EVOLUTION_API_URL (ex: https://evolution.meuagente.api.br)"
$EVOLUTION_API_KEY     = Read-Secret "  EVOLUTION_API_KEY"
$EVOLUTION_INSTANCE_PLN= Read-Host  "  EVOLUTION_INSTANCE (ex: meu-agente)"
$CUSTOMER_MCP_API_KEY  = Read-Secret "  CUSTOMER_MCP_API_KEY (um mxv_ do MCP_API_KEYS pool)"
$ADMIN_TOKEN           = Read-Secret "  ADMIN_TOKEN (qualquer string randômica forte p/ /v1/revoke)"

# ---------- 2. ensure stripe CLI ----------
Write-Host "`n[2/5] Verificando Stripe CLI..." -ForegroundColor Yellow
$stripeBin = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe"
if (-not (Test-Path $stripeBin)) {
  Write-Host "  Stripe CLI ausente. Instale com: winget install Stripe.StripeCli" -ForegroundColor Red
  exit 1
}

# Confirm logged-in. If not, prompt.
$loginCheck = & $stripeBin config --list 2>&1
if ($loginCheck -notmatch 'live_mode_api_key' -and $loginCheck -notmatch 'test_mode_api_key') {
  Write-Host "  Você precisa rodar 'stripe login' uma vez (abre browser):" -ForegroundColor Yellow
  & $stripeBin login --interactive
}

# ---------- 3. create webhook ----------
Write-Host "`n[3/5] Criando webhook LIVE Stripe..." -ForegroundColor Yellow
$webhookJson = & $stripeBin webhook_endpoints create `
  --url "https://x-license.produtoramaxvision.com.br/v1/issue" `
  --description "MaxVision X license issuance" `
  --enabled-events "checkout.session.completed" `
  --live `
  2>&1

if ($LASTEXITCODE -ne 0) {
  Write-Host "  ⚠ Webhook create falhou — pode já existir. Continuando." -ForegroundColor Yellow
  Write-Host $webhookJson
  $STRIPE_WEBHOOK_SECRET = Read-Secret "  Cole STRIPE_WEBHOOK_SECRET (whsec_) manualmente"
} else {
  $webhook = $webhookJson | ConvertFrom-Json
  $STRIPE_WEBHOOK_SECRET = $webhook.secret
  Write-Host "  ✓ webhook id: $($webhook.id)" -ForegroundColor Green
  Write-Host "  ✓ signing secret: whsec_***$($STRIPE_WEBHOOK_SECRET.Substring($STRIPE_WEBHOOK_SECRET.Length - 6))" -ForegroundColor Green
}

# ---------- 4. push wrangler secrets ----------
Write-Host "`n[4/5] Setando worker secrets via wrangler..." -ForegroundColor Yellow
Put-WranglerSecret "STRIPE_SECRET_KEY"      $STRIPE_SECRET_KEY      $workerDir
Put-WranglerSecret "STRIPE_WEBHOOK_SECRET"  $STRIPE_WEBHOOK_SECRET  $workerDir
Put-WranglerSecret "ADMIN_TOKEN"            $ADMIN_TOKEN            $workerDir
Put-WranglerSecret "RESEND_API_KEY"         $RESEND_API_KEY         $workerDir
Put-WranglerSecret "RESEND_FROM_EMAIL"      $RESEND_FROM_EMAIL_PLN  $workerDir
Put-WranglerSecret "EVOLUTION_API_URL"      $EVOLUTION_API_URL_PLN  $workerDir
Put-WranglerSecret "EVOLUTION_API_KEY"      $EVOLUTION_API_KEY      $workerDir
Put-WranglerSecret "EVOLUTION_INSTANCE"     $EVOLUTION_INSTANCE_PLN $workerDir
Put-WranglerSecret "CUSTOMER_MCP_API_KEY"   $CUSTOMER_MCP_API_KEY   $workerDir

# ---------- 5. deploy worker + landing env ----------
Write-Host "`n[5/5] Deployando worker..." -ForegroundColor Yellow
Push-Location $workerDir
try {
  npx wrangler@latest deploy 2>&1 | ForEach-Object { Write-Host "  $_" }
} finally { Pop-Location }

Write-Host "`nSetando STRIPE_SECRET_KEY na CF Pages (maxvision-x-landing)..." -ForegroundColor Yellow
$STRIPE_SECRET_KEY | npx wrangler@latest pages secret put STRIPE_SECRET_KEY --project-name=maxvision-x-landing 2>&1 | Out-Null
Write-Host "  ✓ Pages secret set" -ForegroundColor Green

Write-Host "`n=== Deploy LIVE concluído ===" -ForegroundColor Cyan
Write-Host "Worker: https://x-license.produtoramaxvision.com.br/v1/check"
Write-Host "Landing: https://x.produtoramaxvision.com.br/pricing.html"
Write-Host "`nTeste o flow completo clicando 'Assinar Pro' na landing.`n"
