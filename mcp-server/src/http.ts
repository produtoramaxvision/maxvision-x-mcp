/**
 * http — HTTP transport for the X MCP server.
 *
 * Endpoints:
 *   GET  /health   — liveness + browser pool stats (no auth)
 *   GET  /metrics  — Prometheus text format (no auth, scrape from inside cluster)
 *   POST /mcp      — JSON-RPC over MCP Streamable HTTP, requires API key
 *   POST /admin/account-cookie — persist fresh `auth_token` cookie for an account
 *   POST /webhooks/* — n8n hybrid Variant B fanout (requires WEBHOOK_SECRET)
 *   GET  /events   — SSE stream for n8n consumers
 *
 * Stateless mode: per-request McpServer + transport (SDK 1.x invariant).
 */
import { createHash, randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from './logger.js';
import { authenticateApiKey } from './auth/api-key.js';
import { encryptCookie } from './auth/cookies.js';
import { withRequestContext } from './auth/request-context.js';
import { env } from './env.js';
import { db } from './db/client.js';
import { accounts, auditLog, oauthTokens } from './db/schema.js';
import { registerAllTools } from './tools/_registry.js';
import { browserPool } from './browser/pool.js';
import { SERVER_NAME, SERVER_VERSION } from './version.js';

/**
 * X cookie schema — `auth_token` is the primary; `ct0` (CSRF) is required for
 * write actions; `guest_id` and others help fingerprint stability.
 */
const XCookieSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(4000),
  domain: z.string().min(1).max(200),
  path: z.string().default('/'),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  expires: z.number().optional(),
});

const AdminCookieBodySchema = z
  .object({
    accountId: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
    displayName: z.string().min(1).max(200).optional(),
    cookieValue: z.string().min(30).max(500).optional(),
    cookies: z.array(XCookieSchema).min(1).max(50).optional(),
    expiresInDays: z.number().int().min(1).max(365).default(90),
  })
  .refine((d) => d.cookies !== undefined || d.cookieValue !== undefined, {
    message: 'either `cookies` array or `cookieValue` string is required',
    path: ['cookies'],
  });

const startedAt = Date.now();

// --- OAuth 2.0 PKCE state store (in-memory, TTL 10 min) ---
interface PkceState {
  accountId: string;
  codeVerifier: string;
  expiresAt: number;
}
const pkceStore = new Map<string, PkceState>();

function prunePkceStore() {
  const now = Date.now();
  for (const [k, v] of pkceStore) {
    if (v.expiresAt < now) pkceStore.delete(k);
  }
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const X_OAUTH_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_OAUTH_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
const OAUTH_SCOPES =
  'tweet.read tweet.write users.read like.read like.write follows.read follows.write dm.read dm.write offline.access';

function getPublicBaseUrl(): string {
  return process.env['PUBLIC_URL'] ?? 'https://x-api.produtoramaxvision.com.br';
}

export async function startHttpServer(port: number): Promise<void> {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        latency_ms: Date.now() - start,
      },
      'http request',
    );
  });

  app.get('/health', (c) => {
    const browser = browserPool.getStats();
    return c.json({
      status: 'ok',
      uptime_ms: Date.now() - startedAt,
      version: SERVER_VERSION,
      transport: 'http',
      browser,
    });
  });

  app.get('/metrics', (c) => {
    const lines = [
      '# HELP x_mcp_uptime_seconds Server uptime in seconds',
      '# TYPE x_mcp_uptime_seconds counter',
      `x_mcp_uptime_seconds ${(Date.now() - startedAt) / 1000}`,
    ];
    return c.text(lines.join('\n') + '\n', 200, {
      'content-type': 'text/plain; version=0.0.4',
    });
  });

  app.post('/admin/account-cookie', async (c) => {
    const auth = await authenticateApiKey(c.req.raw);
    if (!auth.ok) {
      logger.warn({ reason: auth.reason }, 'auth fail on /admin/account-cookie');
      return c.json({ error: 'unauthorized', message: auth.reason }, 401);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = AdminCookieBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'validation_fail', details: parsed.error.flatten() },
        400,
      );
    }

    const { accountId, displayName, cookieValue, cookies, expiresInDays } = parsed.data;
    const cookiesArray =
      cookies && cookies.length > 0
        ? cookies
        : [
            {
              name: 'auth_token',
              value: cookieValue!,
              domain: '.x.com',
              path: '/',
              httpOnly: true,
              secure: true,
              sameSite: 'None' as const,
            },
          ];
    const blob = encryptCookie(JSON.stringify(cookiesArray));
    const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000);

    await db
      .insert(accounts)
      .values({
        id: accountId,
        displayName: displayName ?? 'Default Account',
        cookieEncrypted: blob,
        cookieExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          displayName: displayName ?? sql`${accounts.displayName}`,
          cookieEncrypted: blob,
          cookieExpiresAt: expiresAt,
          updatedAt: new Date(),
          status: 'active',
        },
      });

    const blobSha = createHash('sha256').update(blob).digest('hex').slice(0, 16);
    db.insert(auditLog)
      .values({
        tool: 'admin.cookie_refresh',
        accountId,
        inputHash: blobSha,
        success: true,
      })
      .catch((err: unknown) => {
        logger.warn(
          { err: (err as Error).message, accountId },
          'audit_log insert failed (admin.cookie_refresh)',
        );
      });

    return c.json({ accountId, expiresAt: expiresAt.toISOString() });
  });

  app.post('/mcp', async (c) => {
    const auth = await authenticateApiKey(c.req.raw);
    if (!auth.ok) {
      logger.warn({ reason: auth.reason }, 'auth fail on /mcp');
      return c.json({ error: 'unauthorized', message: auth.reason }, 401);
    }

    const licenseKey = c.req.header('x-maxvision-license') ?? undefined;
    const ctx: import('./auth/request-context.js').RequestContext = { licenseKey };

    return withRequestContext(ctx, async () => {
      const mcp = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
      registerAllTools(mcp);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await mcp.connect(transport);
      return transport.handleRequest(c.req.raw);
    });
  });

  // Webhook routes (n8n hybrid Variant B). Disabled when WEBHOOK_SECRET unset.
  const webhookSecret = process.env['WEBHOOK_SECRET'];

  function checkWebhookSecret(c: { req: { header: (n: string) => string | undefined } }): boolean {
    if (!webhookSecret) return false;
    return c.req.header('x-webhook-secret') === webhookSecret;
  }

  app.post('/webhooks/post-engagement', async (c) => {
    if (!webhookSecret) return c.json({ error: 'webhooks_disabled' }, 503);
    if (!checkWebhookSecret(c)) return c.json({ error: 'unauthorized' }, 401);
    const body = await c.req.json().catch(() => null);
    logger.info({ event: 'post-engagement', payload: body }, 'webhook received');
    return c.json({ received: true });
  });

  app.post('/webhooks/mention', async (c) => {
    if (!webhookSecret) return c.json({ error: 'webhooks_disabled' }, 503);
    if (!checkWebhookSecret(c)) return c.json({ error: 'unauthorized' }, 401);
    const body = await c.req.json().catch(() => null);
    logger.info({ event: 'mention', payload: body }, 'webhook received');
    return c.json({ received: true });
  });

  app.get('/events', async (c) => {
    if (!webhookSecret) return c.json({ error: 'webhooks_disabled' }, 503);
    if (!checkWebhookSecret(c)) return c.json({ error: 'unauthorized' }, 401);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('event: connected\ndata: {}\n\n'));
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(enc.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);
        c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            // closed
          }
        });
      },
    });
    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  });

  // ----------------------------------------------------------------
  // OAuth 2.0 PKCE — GET /admin/oauth-start?accountId=default
  // Requires API key. Returns redirect to X authorization URL.
  // ----------------------------------------------------------------
  app.get('/admin/oauth-start', async (c) => {
    const auth = await authenticateApiKey(c.req.raw);
    if (!auth.ok) return c.json({ error: 'unauthorized', message: auth.reason }, 401);

    const clientId = env.X_API_CLIENT_ID;
    if (!clientId) return c.json({ error: 'config_fail', message: 'X_API_CLIENT_ID not set' }, 503);

    const accountId = c.req.query('accountId') ?? 'default';

    // PKCE: code_verifier = 32 random bytes → base64url (43 chars, well within 43-128)
    const verifierBuf = randomBytes(32);
    const codeVerifier = base64url(verifierBuf);
    const codeChallenge = base64url(
      Buffer.from(createHash('sha256').update(codeVerifier).digest()),
    );
    const state = base64url(randomBytes(16));

    prunePkceStore();
    pkceStore.set(state, { accountId, codeVerifier, expiresAt: Date.now() + 10 * 60 * 1000 });

    const redirectUri = `${getPublicBaseUrl()}/admin/oauth-callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    const authUrl = `${X_OAUTH_AUTHORIZE_URL}?${params.toString()}`;

    logger.info({ accountId, state: state.slice(0, 8) + '…' }, 'oauth_start');
    return c.redirect(authUrl, 302);
  });

  // ----------------------------------------------------------------
  // OAuth 2.0 PKCE — GET /admin/oauth-callback?code=...&state=...
  // X redirects here after user approves. No API key required (public
  // redirect URL), but state validates the origin.
  // ----------------------------------------------------------------
  app.get('/admin/oauth-callback', async (c) => {
    const clientId = env.X_API_CLIENT_ID;
    const clientSecret = env.X_API_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return c.json({ error: 'config_fail', message: 'X_API_CLIENT_ID/SECRET not set' }, 503);
    }

    const code = c.req.query('code');
    const state = c.req.query('state');
    const errorParam = c.req.query('error');

    if (errorParam) {
      logger.warn({ error: errorParam }, 'oauth_callback_denied');
      return c.json({ error: 'oauth_denied', message: errorParam }, 400);
    }
    if (!code || !state) {
      return c.json({ error: 'invalid_request', message: 'Missing code or state' }, 400);
    }

    prunePkceStore();
    const pkce = pkceStore.get(state);
    if (!pkce || pkce.expiresAt < Date.now()) {
      return c.json({ error: 'invalid_state', message: 'Unknown or expired state. Restart OAuth flow.' }, 400);
    }
    pkceStore.delete(state);

    const redirectUri = `${getPublicBaseUrl()}/admin/oauth-callback`;

    // Exchange code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: pkce.codeVerifier,
    });

    const tokenRes = await fetch(X_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${credentials}`,
      },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error({ status: tokenRes.status, body: errText.slice(0, 300) }, 'oauth_token_exchange_fail');
      return c.json({ error: 'token_exchange_fail', detail: errText.slice(0, 300) }, 502);
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    const expiresAt = new Date(Date.now() + tokenJson.expires_in * 1000);
    const accessEnc = encryptCookie(tokenJson.access_token);
    const refreshEnc = tokenJson.refresh_token ? encryptCookie(tokenJson.refresh_token) : null;
    const scopes = tokenJson.scope.split(' ');

    await db
      .insert(oauthTokens)
      .values({
        accountId: pkce.accountId,
        accessToken: accessEnc,
        refreshToken: refreshEnc ?? undefined,
        expiresAt,
        scopes,
      })
      .onConflictDoUpdate({
        target: oauthTokens.accountId,
        set: {
          accessToken: accessEnc,
          refreshToken: refreshEnc ?? sql`${oauthTokens.refreshToken}`,
          expiresAt,
          scopes,
          updatedAt: new Date(),
        },
      });

    logger.info({ accountId: pkce.accountId, scopes, expiresAt }, 'oauth_token_stored');

    return c.json({
      ok: true,
      accountId: pkce.accountId,
      scopes,
      expiresAt: expiresAt.toISOString(),
      message: 'OAuth token stored. Write tools are now unlocked for this account.',
    });
  });

  // Convenience alias — browser-friendly entry point
  // GET /x-oauth-connect?accountId=default (no API key in URL; user must open in browser after copying their key)
  app.get('/x-oauth-connect', async (c) => {
    const auth = await authenticateApiKey(c.req.raw);
    if (!auth.ok) {
      // Return HTML hint instead of bare JSON for better UX when opened in browser
      return c.html(
        `<h2>X OAuth Connect</h2>
         <p>Open this URL with your API key in the Authorization header, or use:</p>
         <pre>curl -L -H "Authorization: Bearer YOUR_API_KEY" \
"${getPublicBaseUrl()}/x-oauth-connect?accountId=default"</pre>
         <p>Or use <code>/admin/oauth-start?accountId=default</code> directly.</p>`,
        401,
      );
    }
    const accountId = c.req.query('accountId') ?? 'default';
    // Forward to oauth-start (same process)
    return c.redirect(
      `${getPublicBaseUrl()}/admin/oauth-start?accountId=${encodeURIComponent(accountId)}`,
      302,
    );
  });

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  app.onError((err, c) => {
    logger.error({ err: err.message, stack: err.stack }, 'unhandled http error');
    return c.json({ error: 'internal_error' }, 500);
  });

  return new Promise((resolve) => {
    serve({ fetch: app.fetch, port }, (info) => {
      logger.info({ port: info.port }, 'hono HTTP server listening');
      resolve();
    });
  });
}
