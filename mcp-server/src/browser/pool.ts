/**
 * Patchright browser pool — Layer D fallback (gated ToS-grey, opt-in flag).
 *
 * Per-accountId persistent context at `${PROFILE_BASE_DIR}/<accountId>`.
 * Cookies (`auth_token`, `ct0`) restored from `accounts.cookie_encrypted`
 * (AES-256-GCM) when context spins up.
 *
 * Sprint 1: minimal stub that exposes `getStats()` for /health and a no-op
 * shutdown. Actual context creation lives in `browser/context.ts` (loaded
 * lazily by tools that need it — most v0.1 tools don't).
 */
import { logger } from '../logger.js';

interface PoolStats {
  contextsActive: number;
  contextsTotal: number;
  enabled: boolean;
}

let stats: PoolStats = {
  contextsActive: 0,
  contextsTotal: 0,
  enabled: process.env['PATCHRIGHT_HEADLESS'] !== undefined,
};

export const browserPool = {
  getStats(): PoolStats {
    return { ...stats };
  },

  async shutdown(): Promise<void> {
    logger.info({ active: stats.contextsActive }, 'browser pool shutdown');
    stats = { ...stats, contextsActive: 0 };
  },

  incrementActive(): void {
    stats.contextsActive++;
    stats.contextsTotal++;
  },

  decrementActive(): void {
    stats.contextsActive = Math.max(0, stats.contextsActive - 1);
  },
};
