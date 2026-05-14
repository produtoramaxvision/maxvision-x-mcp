/**
 * api-key — API key authentication for the HTTP transport.
 *
 * Accepts `Authorization: Bearer <key>` or `X-Api-Key: <key>`.
 * Empty allowlist = open mode (dev default).
 * Constant-time compare against env.MCP_API_KEYS via timingSafeEqual.
 */
import { timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';

export interface AuthResult {
  ok: boolean;
  reason?: string;
}

export async function authenticateApiKey(req: Request): Promise<AuthResult> {
  const allowlist = env.MCP_API_KEYS;

  if (allowlist.length === 0) {
    logger.warn({}, 'auth bypass: MCP_API_KEYS empty (open mode)');
    return { ok: true };
  }

  const auth = req.headers.get('authorization');
  const xApiKey = req.headers.get('x-api-key');
  let presented: string | null = null;

  if (auth?.startsWith('Bearer ')) {
    presented = auth.slice('Bearer '.length).trim();
  } else if (xApiKey) {
    presented = xApiKey.trim();
  }

  if (!presented) {
    void recordAuthFail('missing');
    return {
      ok: false,
      reason: 'missing api key (use Authorization: Bearer <key> or X-Api-Key: <key>)',
    };
  }

  const presentedBuf = Buffer.from(presented, 'utf8');
  let matched = false;
  for (const valid of allowlist) {
    const validBuf = Buffer.from(valid, 'utf8');
    if (validBuf.length !== presentedBuf.length) continue;
    if (timingSafeEqual(presentedBuf, validBuf)) {
      matched = true;
    }
  }
  if (matched) return { ok: true };

  void recordAuthFail('invalid', presented.slice(0, 8) + '...');
  return { ok: false, reason: 'invalid api key' };
}

async function recordAuthFail(reason: string, keyPrefix?: string): Promise<void> {
  try {
    await db.insert(auditLog).values({
      tool: 'auth.fail',
      success: false,
      errorMsg: keyPrefix ? `${reason}:${keyPrefix}` : reason,
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'audit_log insert failed (auth.fail)');
  }
}
