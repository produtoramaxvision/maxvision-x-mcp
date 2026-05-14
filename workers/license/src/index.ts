/**
 * MaxVision X — License server (Cloudflare Worker).
 *
 * Endpoints:
 *   POST /v1/check                              {licenseKey} → {valid, tier, expiresAt}
 *   POST /v1/issue                              Stripe webhook → KV write + optional notify
 *   POST /v1/revoke                             admin only (Bearer ADMIN_TOKEN)
 *   GET  /v1/license-by-session?session=cs_xxx  → {licenseKey} (post-checkout /thanks)
 *
 * License key format: `MAXV-X-<TIER>-<RANDOM_HEX>` where TIER ∈ {PRO, AGENCY}.
 * KV layout:
 *   {licenseKey}                → JSON LicenseRecord
 *   session:{stripe_session_id} → licenseKey
 */
export interface Env {
  LICENSES: KVNamespace;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
  ENVIRONMENT: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
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
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // constant-time compare
  if (sigHex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < sigHex.length; i++) diff |= sigHex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

function randomLicenseKey(tier: 'pro' | 'agency'): string {
  const tierUpper = tier.toUpperCase();
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `MAXV-X-${tierUpper}-${hex}`;
}

async function handleIssue(req: Request, env: Env): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return json(400, { error: 'missing_signature' });

  const rawBody = await req.text();
  const ok = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json(400, { error: 'signature_invalid' });

  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
  if (event.type !== 'checkout.session.completed') {
    return json(200, { ignored: event.type });
  }
  const session = event.data.object;
  const tier =
    ((session['metadata'] as Record<string, string> | undefined)?.['tier'] as
      | 'pro'
      | 'agency'
      | undefined) ?? 'pro';
  const email = (session['customer_details'] as Record<string, string> | undefined)?.[
    'email'
  ] as string | undefined;
  const customerId = session['customer'] as string | undefined;
  const sessionId = session['id'] as string | undefined;

  if (!email || !sessionId) {
    return json(400, { error: 'missing_email_or_session_id' });
  }

  const licenseKey = randomLicenseKey(tier);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 86400 * 1000).toISOString();

  const record: LicenseRecord = {
    tier,
    customerEmail: email,
    stripeCustomerId: customerId ?? 'unknown',
    issuedAt,
    expiresAt,
    revokedAt: null,
  };

  await env.LICENSES.put(licenseKey, JSON.stringify(record));
  await env.LICENSES.put(`session:${sessionId}`, licenseKey);

  // Optional: email notification via Resend
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: email,
          subject: `Sua chave MaxVision X Suite (${tier.toUpperCase()})`,
          html: `<p>Olá!</p><p>Sua chave de licença <strong>${licenseKey}</strong>.</p><p>Documentação: <a href="https://x.produtoramaxvision.com.br">x.produtoramaxvision.com.br</a></p>`,
        }),
      });
    } catch {
      // best-effort
    }
  }

  return json(200, { licenseKey, tier });
}

async function handleRevoke(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return json(401, { error: 'unauthorized' });

  let body: { licenseKey?: string };
  try {
    body = (await req.json()) as { licenseKey?: string };
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const key = body.licenseKey;
  if (!key) return json(400, { error: 'missing_license_key' });

  const raw = await env.LICENSES.get(key);
  if (!raw) return json(404, { error: 'not_found' });
  const rec = JSON.parse(raw) as LicenseRecord;
  rec.revokedAt = new Date().toISOString();
  await env.LICENSES.put(key, JSON.stringify(rec));
  return json(200, { revoked: true, revokedAt: rec.revokedAt });
}

async function handleLicenseBySession(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const session = url.searchParams.get('session');
  if (!session) return json(400, { error: 'missing_session' });
  const licenseKey = await env.LICENSES.get(`session:${session}`);
  if (!licenseKey) return json(404, { error: 'not_found' });
  return json(200, { licenseKey });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type, stripe-signature',
        },
      });
    }

    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/v1/check') return handleCheck(req, env);
    if (req.method === 'POST' && url.pathname === '/v1/issue') return handleIssue(req, env);
    if (req.method === 'POST' && url.pathname === '/v1/revoke') return handleRevoke(req, env);
    if (req.method === 'GET' && url.pathname === '/v1/license-by-session')
      return handleLicenseBySession(req, env);
    return json(404, { error: 'not_found' });
  },
};
