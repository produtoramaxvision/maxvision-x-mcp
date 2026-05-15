/**
 * MaxVision X — License server (Cloudflare Worker).
 *
 * Endpoints:
 *   POST /v1/check                              {licenseKey} → {valid, tier, expiresAt}
 *   POST /v1/issue                              Stripe webhook → KV write + email + WhatsApp
 *   POST /v1/revoke                             admin only (Bearer ADMIN_TOKEN)
 *   GET  /v1/license-by-session?session=cs_xxx  → {licenseKey} for /thanks page
 *
 * License key format: `MAXV-X-<TIER>-<RANDOM_HEX>` where TIER ∈ {PRO, AGENCY}.
 * KV layout:
 *   {licenseKey}                → JSON LicenseRecord
 *   session:{stripe_session_id} → licenseKey  (TTL 30d so /thanks can resolve)
 *
 * Notification: on successful checkout.session.completed, send the license key
 * via Resend (email) + Evolution API (WhatsApp, optional). Both are
 * best-effort — webhook still 200s if either delivery fails. The /thanks page
 * also serves the key as a backup channel.
 */
export interface Env {
  LICENSES: KVNamespace;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
  ENVIRONMENT: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  EVOLUTION_INSTANCE?: string;
  // Customer-facing MCP API key (operator-controlled shared key from the
  // MCP_API_KEYS pool in Portainer stack). For v0.1 this is shared across
  // all paying customers — license tier gating is enforced in mcp-server
  // middleware via X-MaxVision-License header.
  CUSTOMER_MCP_API_KEY?: string;
}

interface LicenseRecord {
  tier: 'pro' | 'agency';
  customerEmail: string;
  stripeCustomerId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });

async function handleCheck(req: Request, env: Env): Promise<Response> {
  let body: { licenseKey?: string };
  try {
    body = (await req.json()) as { licenseKey?: string };
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const key = body.licenseKey;
  if (!key || !/^MAXV-X-(PRO|AGENCY)-[A-F0-9]{32}$/i.test(key)) {
    return json(400, { error: 'invalid_license_format' });
  }

  const raw = await env.LICENSES.get(key);
  if (!raw) {
    return json(404, { valid: false, reason: 'not_found' });
  }
  const rec = JSON.parse(raw) as LicenseRecord;
  if (rec.revokedAt) {
    return json(403, { valid: false, reason: 'revoked', revokedAt: rec.revokedAt });
  }
  if (new Date(rec.expiresAt) < new Date()) {
    return json(403, { valid: false, reason: 'expired', expiresAt: rec.expiresAt });
  }
  return json(200, {
    valid: true,
    tier: rec.tier,
    expiresAt: rec.expiresAt,
  });
}

async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=') as [string, string]),
  );
  const ts = parts['t'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

function generateLicenseKey(tier: 'pro' | 'agency'): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `MAXV-X-${tier.toUpperCase()}-${hex}`;
}

/**
 * Resolve the customer-facing MCP API key. For v0.1 this is a SHARED key
 * (CUSTOMER_MCP_API_KEY env) from the static pool in MCP_API_KEYS. The
 * mcp-server uses it as a coarse "is this a paying customer" gate; per-tier
 * gating is enforced by the X-MaxVision-License header which the same
 * middleware validates via /v1/check.
 *
 * Returns empty string when not configured, in which case the email omits
 * the API key block — the operator delivers it out-of-band.
 */
function resolveMcpApiKey(env: Env): string {
  return env.CUSTOMER_MCP_API_KEY ?? '';
}

/**
 * Send the license key via Resend (email). Best-effort — failures logged
 * but not raised. Free tier: 100 emails/day, 3k/month, no domain verification
 * needed when sending FROM `onboarding@resend.dev`. For production, verify
 * `produtoramaxvision.com.br` and switch RESEND_FROM_EMAIL.
 */
async function sendLicenseEmail(
  env: Env,
  to: string,
  licenseKey: string,
  mcpApiKey: string,
  tier: 'pro' | 'agency',
  expiresAt: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!env.RESEND_API_KEY || !to) {
    return { ok: false, error: 'resend_not_configured' };
  }
  const from = env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const tierLabel = tier === 'pro' ? 'Pro' : 'Agency';
  const subject = `Sua license key MaxVision X Suite ${tierLabel}`;
  const expDate = new Date(expiresAt).toLocaleDateString('pt-BR');
  const mcpApiKeyBlock = mcpApiKey
    ? `
  <h2 style="color:#fff;margin-top:24px;font-size:16px">2. MCP API key (auth do transport HTTP)</h2>
  <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;border:1px solid #1e293b"><strong>${mcpApiKey}</strong></pre>`
    : '';
  const html = `<!DOCTYPE html>
<html><body style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:32px auto;color:#0f172a;background:#000;padding:24px;border-radius:16px">
  <h1 style="color:#fff;border-bottom:2px solid #1d9bf0;padding-bottom:12px">Bem-vindo ao MaxVision X Suite ${tierLabel}!</h1>
  <p style="color:#cbd5e1">Sua compra foi confirmada. Abaixo a credencial necessária para o plugin funcionar:</p>

  <h2 style="color:#fff;margin-top:24px;font-size:16px">1. License key (gating de tier)</h2>
  <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;border:1px solid #1e293b"><strong>${licenseKey}</strong></pre>
${mcpApiKeyBlock}
  <p style="color:#cbd5e1;margin-top:16px"><strong style="color:#fff">Validade:</strong> até ${expDate}</p>

  <h2 style="color:#fff;margin-top:32px;font-size:16px">Como usar no Claude Code</h2>
  <ol style="color:#cbd5e1;line-height:1.8">
    <li>Adicione o marketplace:
      <pre style="background:#0f172a;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:12px;margin-top:4px">/plugin marketplace add produtoramaxvision/maxvision-x-mcp</pre>
    </li>
    <li>Instale o plugin:
      <pre style="background:#0f172a;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:12px;margin-top:4px">/plugin install x-maxvision@maxvision-x</pre>
    </li>
    <li>Configure as env vars (PowerShell Windows):
      <pre style="background:#0f172a;color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:12px;margin-top:4px;white-space:pre-wrap">[Environment]::SetEnvironmentVariable("MAXVISION_API_KEY", "${mcpApiKey || '<sua-api-key>'}", "User")
[Environment]::SetEnvironmentVariable("MAXVISION_LICENSE", "${licenseKey}", "User")</pre>
      <p style="color:#94a3b8;font-size:12px">macOS/Linux: <code style="color:#1d9bf0">export MAXVISION_API_KEY=${mcpApiKey || '<sua-api-key>'}</code></p>
    </li>
    <li>Reinicie o Claude Code completamente</li>
    <li>Teste: <code style="color:#1d9bf0">/x-status</code></li>
  </ol>

  <h2 style="color:#fff;margin-top:32px;font-size:16px">Suporte</h2>
  <p style="color:#cbd5e1">
    Documentação: <a href="https://x.produtoramaxvision.com.br" style="color:#1d9bf0">x.produtoramaxvision.com.br</a><br>
    GitHub: <a href="https://github.com/produtoramaxvision/maxvision-x-mcp" style="color:#1d9bf0">github.com/produtoramaxvision/maxvision-x-mcp</a><br>
    Email: <a href="mailto:produtoramaxvision@gmail.com" style="color:#1d9bf0">produtoramaxvision@gmail.com</a>
  </p>

  <hr style="margin-top:32px;border:0;border-top:1px solid #1e293b">
  <p style="font-size:12px;color:#64748b">© 2026 Produtora MaxVision. Estas credenciais são pessoais e intransferíveis. Não compartilhe — qualquer abuso resultará em revogação imediata sem reembolso.</p>
</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: `resend_${res.status}: ${errBody.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `resend_throw: ${(e as Error).message}` };
  }
}

/**
 * Send the license key via Evolution API (self-hosted WhatsApp).
 * Only fires if EVOLUTION_API_URL + EVOLUTION_API_KEY + EVOLUTION_INSTANCE
 * are configured AND the customer provided a phone number at checkout.
 */
async function sendLicenseWhatsApp(
  env: Env,
  phone: string,
  licenseKey: string,
  mcpApiKey: string,
  tier: 'pro' | 'agency',
): Promise<{ ok: boolean; error?: string }> {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY || !env.EVOLUTION_INSTANCE || !phone) {
    return { ok: false, error: 'evolution_not_configured' };
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const tierLabel = tier === 'pro' ? 'Pro' : 'Agency';
  const apiKeyLine = mcpApiKey ? `🔐 MCP API key:\n\`${mcpApiKey}\`\n\n` : '';
  const text =
    `🚀 *MaxVision X Suite ${tierLabel}*\n\n` +
    `Suas credenciais:\n\n` +
    `🔑 License key:\n\`${licenseKey}\`\n\n` +
    apiKeyLine +
    `*Como usar:*\n` +
    `1. /plugin marketplace add produtoramaxvision/maxvision-x-mcp\n` +
    `2. /plugin install x-maxvision@maxvision-x\n` +
    `3. Setar env vars MAXVISION_API_KEY + MAXVISION_LICENSE\n` +
    `4. Reiniciar Claude Code\n` +
    `5. /x-status p/ validar\n\n` +
    `📖 https://x.produtoramaxvision.com.br\n` +
    `💬 produtoramaxvision@gmail.com`;

  try {
    const url = `${env.EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(env.EVOLUTION_INSTANCE)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: env.EVOLUTION_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ number: cleanPhone, text }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: `evo_${res.status}: ${errBody.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `evo_throw: ${(e as Error).message}` };
  }
}

async function handleIssue(req: Request, env: Env): Promise<Response> {
  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) return json(400, { error: 'missing_stripe_signature' });

  const raw = await req.text();
  const valid = await verifyStripeSignature(raw, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json(403, { error: 'invalid_signature' });

  const event = JSON.parse(raw) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  if (event.type !== 'checkout.session.completed') {
    return json(200, { received: true, noop: true });
  }

  const session = event.data.object as {
    id?: string;
    customer_email?: string;
    customer_details?: { email?: string; phone?: string };
    customer?: string;
    metadata?: { tier?: string; expires_in_days?: string };
  };
  const tier = (session.metadata?.tier ?? 'pro') as 'pro' | 'agency';
  if (tier !== 'pro' && tier !== 'agency') {
    return json(400, { error: 'invalid_tier_metadata' });
  }
  const expiresInDays = Number(session.metadata?.expires_in_days ?? '365');
  const customerEmail =
    session.customer_email ?? session.customer_details?.email ?? '';
  const customerPhone = session.customer_details?.phone ?? '';
  const stripeCustomerId = session.customer ?? '';
  const sessionId = session.id ?? '';
  const licenseKey = generateLicenseKey(tier);
  const mcpApiKey = resolveMcpApiKey(env);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 86400 * 1000);
  const rec: LicenseRecord = {
    tier,
    customerEmail,
    stripeCustomerId: String(stripeCustomerId),
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  };
  await env.LICENSES.put(licenseKey, JSON.stringify(rec), {
    expirationTtl: expiresInDays * 86400 + 86400,
  });
  if (sessionId) {
    await env.LICENSES.put(`session:${sessionId}`, licenseKey, {
      expirationTtl: 30 * 86400,
    });
    // Also store the MCP api key keyed by session so /thanks can fetch it.
    await env.LICENSES.put(`session:${sessionId}:mcpkey`, mcpApiKey, {
      expirationTtl: 30 * 86400,
    });
  }

  const emailRes = await sendLicenseEmail(env, customerEmail, licenseKey, mcpApiKey, tier, rec.expiresAt);
  const whatsappRes = await sendLicenseWhatsApp(env, customerPhone, licenseKey, mcpApiKey, tier);

  return json(200, {
    received: true,
    licenseKey,
    mcpApiKey,
    tier,
    expiresAt: rec.expiresAt,
    notifications: { email: emailRes, whatsapp: whatsappRes },
  });
}

async function handleRevoke(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return json(401, { error: 'unauthorized' });

  let body: { licenseKey?: string };
  try {
    body = (await req.json()) as { licenseKey?: string };
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const key = body.licenseKey;
  if (!key) return json(400, { error: 'missing_licenseKey' });

  const raw = await env.LICENSES.get(key);
  if (!raw) return json(404, { error: 'not_found' });
  const rec = JSON.parse(raw) as LicenseRecord;
  rec.revokedAt = new Date().toISOString();
  await env.LICENSES.put(key, JSON.stringify(rec));
  return json(200, { revoked: true, licenseKey: key, revokedAt: rec.revokedAt });
}

async function handleLicenseBySession(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session');
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return json(400, { error: 'invalid_session_id' });
  }
  const licenseKey = await env.LICENSES.get(`session:${sessionId}`);
  if (!licenseKey) {
    return json(404, { error: 'not_found_yet', hint: 'Webhook may not have processed yet — retry in 5–10 seconds.' });
  }
  const raw = await env.LICENSES.get(licenseKey);
  if (!raw) return json(404, { error: 'license_not_found' });
  const rec = JSON.parse(raw) as LicenseRecord;
  const mcpApiKey = (await env.LICENSES.get(`session:${sessionId}:mcpkey`)) ?? '';
  return json(200, {
    licenseKey,
    mcpApiKey,
    tier: rec.tier,
    expiresAt: rec.expiresAt,
    customerEmail: rec.customerEmail,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization, stripe-signature',
        },
      });
    }

    if (request.method === 'POST' && url.pathname === '/v1/check') {
      return handleCheck(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/v1/issue') {
      return handleIssue(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/v1/revoke') {
      return handleRevoke(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/v1/license-by-session') {
      return handleLicenseBySession(request, env);
    }
    return json(404, { error: 'route_not_found', path: url.pathname });
  },
};
