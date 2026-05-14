/**
 * Anti-detect utilities for Patchright contexts.
 *
 * Sprint 1: stub. Real implementation lands in Sprint 2 when `x_get_replies_tree`
 * and `x_space_transcript` need real browser sessions.
 *
 * Notes:
 * - Patchright bundles modern Chromium with stealth patches; we DO NOT
 *   inject custom UAs or override viewport — Patchright manages fingerprint.
 * - Mouse-movement humanization + random delays applied per-action.
 * - Quiet hours (22:00–06:00 user local) — no writes during this window.
 */
export function isQuietHours(now = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 22 || hour < 6;
}

export function randomDelay(min = 1500, max = 4000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((r) => setTimeout(r, ms));
}
