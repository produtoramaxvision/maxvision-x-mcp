/**
 * License gating — tier-based tool gate.
 *
 * REQUIRES_PRO: writes + premium reads (post, reply, quote, like, follow, etc).
 * REQUIRES_AGENCY: DM operations + ads (when ads tools land in v0.3).
 *
 * Cache: 5-min in-memory LRU keyed by license key. Stale `valid:true` is
 * preferable to per-call worker round-trip.
 *
 * Fail-closed: if license server is unreachable, requests are denied.
 */
import { logger } from '../logger.js';
import { env } from '../env.js';

const REQUIRES_PRO: ReadonlySet<string> = new Set([
  'x_post_tweet',
  'x_reply',
  'x_quote_tweet',
  'x_like_unlike',
  'x_follow_unfollow',
  'x_search_users',
  'x_get_followers',
  'x_get_following',
  'x_get_replies_tree',
]);

const REQUIRES_AGENCY: ReadonlySet<string> = new Set([
  'x_send_dm',
]);

interface LicenseCheckResult {
  valid: boolean;
  tier?: 'pro' | 'agency';
  expiresAt?: string;
  reason?: string;
}

const cache = new Map<string, { res: LicenseCheckResult; exp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchLicense(licenseKey: string): Promise<LicenseCheckResult> {
  try {
    const res = await fetch(`${env.LICENSE_SERVER_URL}/v1/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });
    const body = (await res.json()) as Partial<LicenseCheckResult>;
    return {
      valid: !!body.valid,
      tier: body.tier,
      expiresAt: body.expiresAt,
      reason: body.reason,
    };
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'license server unreachable — failing closed (deny)',
    );
    return { valid: false, reason: 'license_server_unreachable' };
  }
}

async function checkLicense(licenseKey: string): Promise<LicenseCheckResult> {
  const now = Date.now();
  const cached = cache.get(licenseKey);
  if (cached && cached.exp > now) return cached.res;
  const res = await fetchLicense(licenseKey);
  cache.set(licenseKey, { res, exp: now + CACHE_TTL_MS });
  return res;
}

export async function gateToolByLicense(
  toolName: string,
  licenseHeader: string | undefined,
): Promise<string | null> {
  if (env.LICENSE_CHECK_ENABLED !== 'true') return null;
  if (!REQUIRES_PRO.has(toolName) && !REQUIRES_AGENCY.has(toolName)) return null;

  if (!licenseHeader) {
    return `Tool "${toolName}" requires a Pro or Agency license. Set X-MaxVision-License header.`;
  }
  const result = await checkLicense(licenseHeader);
  if (!result.valid) {
    return `License invalid (${result.reason ?? 'unknown'}). Renew via https://x.produtoramaxvision.com.br/pricing`;
  }
  if (REQUIRES_AGENCY.has(toolName) && result.tier !== 'agency') {
    return `Tool "${toolName}" requires Agency tier (have: ${result.tier}).`;
  }
  return null;
}

export function isProTool(toolName: string): boolean {
  return REQUIRES_PRO.has(toolName) || REQUIRES_AGENCY.has(toolName);
}
