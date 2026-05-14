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
import { createHash } from 'node:crypto';
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
import { db } from './db/client.js';
import { accounts, auditLog } from './db/schema.js';
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
