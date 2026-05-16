/**
 * Patchright browser context factory — Layer D.
 *
 * Creates a fresh Chromium context per request, injects account cookies
 * from `accounts.cookie_encrypted`, and tracks lifecycle via browserPool.
 *
 * Requires PLAYWRIGHT_BROWSERS_PATH=/app/browsers (set at module load).
 */

// Must be set before patchright imports its browser registry
if (!process.env['PLAYWRIGHT_BROWSERS_PATH']) {
  process.env['PLAYWRIGHT_BROWSERS_PATH'] = '/app/browsers';
}

import { chromium, type BrowserContext } from 'patchright';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { accounts } from '../db/schema.js';
import { decryptCookie } from '../auth/cookies.js';
import { browserPool } from './pool.js';
import { logger } from '../logger.js';

interface StoredCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export async function createAccountContext(accountId: string): Promise<BrowserContext> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const acc = rows[0];
  if (!acc) throw new Error(`Account "${accountId}" not found in DB`);

  const rawCookies = JSON.parse(decryptCookie(acc.cookieEncrypted)) as StoredCookie[];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
    timezoneId: 'America/Sao_Paulo',
  });

  await context.addCookies(
    rawCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain ?? '.x.com',
      path: c.path ?? '/',
      httpOnly: c.httpOnly ?? c.name === 'auth_token',
      secure: c.secure ?? true,
      sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') ?? 'None',
    })),
  );

  browserPool.incrementActive();
  context.on('close', async () => {
    browserPool.decrementActive();
    await browser.close().catch(() => {});
  });

  logger.info({ accountId }, 'layer_d_context_created');
  return context;
}
