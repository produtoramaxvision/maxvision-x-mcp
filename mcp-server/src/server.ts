/**
 * server — entrypoint for the MaxVision X (Twitter) MCP server.
 *
 * Bootstraps the McpServer, registers tools, and connects the configured
 * transport (stdio for Claude Desktop / Claude Code; HTTP via Hono for
 * production VPS deployment at x-api.produtoramaxvision.com.br).
 *
 * Graceful shutdown: SIGINT/SIGTERM closes the browser pool (Patchright
 * teardown drains in-flight contexts), quits the Redis client used by the
 * rate-limit token bucket, then exits 0. The Postgres pool is left to close
 * on process exit — idempotent and short-lived idle connections are fine.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from './env.js';
import { logger } from './logger.js';
import { registerAllTools } from './tools/_registry.js';
import { startHttpServer } from './http.js';
import { browserPool } from './browser/pool.js';
import { shutdownRateLimit } from './rate-limit/token-bucket.js';
import { db } from './db/client.js';
import { SERVER_NAME, SERVER_VERSION } from './version.js';

const MIGRATIONS_FOLDER = './drizzle/migrations';

async function migrateWithRetry(maxAttempts = 10): Promise<void> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      logger.info({ attempt: i }, 'drizzle migrations applied');
      return;
    } catch (err) {
      if (i === maxAttempts) throw err;
      const wait = Math.min(2 ** i * 500, 10000);
      logger.warn(
        { attempt: i, max: maxAttempts, err: (err as Error).message, wait_ms: wait },
        'migration retry (postgres may not be ready)',
      );
      await new Promise<void>((r) => setTimeout(r, wait));
    }
  }
}

async function main(): Promise<void> {
  if (env.MCP_TRANSPORT === 'http' && env.MCP_API_KEYS.length === 0) {
    logger.warn(
      {},
      'HTTP mode without MCP_API_KEYS = open server. NOT FOR PRODUCTION.',
    );
  }

  await migrateWithRetry();

  if (env.MCP_TRANSPORT === 'stdio') {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
    registerAllTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info({ transport: 'stdio' }, `${SERVER_NAME} v${SERVER_VERSION} ready`);
  } else {
    await startHttpServer(env.MCP_PORT);
    logger.info(
      { transport: 'http', port: env.MCP_PORT },
      `${SERVER_NAME} v${SERVER_VERSION} ready`,
    );
  }
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});

async function gracefulShutdown(sig: string): Promise<void> {
  logger.info({ sig }, 'graceful shutdown starting');
  try {
    await browserPool.shutdown();
    await shutdownRateLimit();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'shutdown error (non-fatal)');
  }
  process.exit(0);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    void gracefulShutdown(sig);
  });
}
