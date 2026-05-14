/**
 * Per-action rate limit policy.
 *
 * X API v2 has aggressive opaque limits; writes have ban risk. Defaults are
 * conservative; tune per-account in Sprint 2+.
 */
import { db } from '../db/client.js';
import { rateLimitEvents } from '../db/schema.js';
import { acquireToken } from './token-bucket.js';

export type Action =
  // Read (Layer A / B / C)
  | 'x_search_posts'
  | 'x_search_users'
  | 'x_get_post'
  | 'x_get_user_profile'
  | 'x_get_user_timeline'
  | 'x_get_followers'
  | 'x_get_following'
  | 'x_get_replies_tree'
  | 'x_post_metrics'
  | 'x_profile_activity'
  // Write (Layer B)
  | 'x_post_tweet'
  | 'x_reply'
  | 'x_quote_tweet'
  | 'x_like_unlike'
  | 'x_follow_unfollow'
  | 'x_send_dm';

const POLICY: Record<Action, { capacity: number; refillRate: number }> = {
  // Reads — moderate to lenient
  x_search_posts: { capacity: 30, refillRate: 0.5 },          // Grok x_search ~30/min burst, 30/min sustained
  x_search_users: { capacity: 15, refillRate: 0.25 },
  x_get_post: { capacity: 30, refillRate: 0.5 },
  x_get_user_profile: { capacity: 20, refillRate: 0.3 },
  x_get_user_timeline: { capacity: 15, refillRate: 0.25 },
  x_get_followers: { capacity: 10, refillRate: 0.1 },
  x_get_following: { capacity: 10, refillRate: 0.1 },
  x_get_replies_tree: { capacity: 10, refillRate: 0.15 },
  x_post_metrics: { capacity: 20, refillRate: 0.3 },
  x_profile_activity: { capacity: 15, refillRate: 0.25 },
  // Writes — strict (X bans aggressive automation)
  x_post_tweet: { capacity: 5, refillRate: 0.01 },             // ~36/h sustained, 5 burst
  x_reply: { capacity: 10, refillRate: 0.02 },                  // ~72/h sustained
  x_quote_tweet: { capacity: 5, refillRate: 0.01 },
  x_like_unlike: { capacity: 20, refillRate: 0.1 },             // X allows ~1000 likes/day
  x_follow_unfollow: { capacity: 10, refillRate: 0.02 },        // follow has stricter ban detection
  x_send_dm: { capacity: 5, refillRate: 0.01 },                 // strict — DM spam = instant ban
};

export async function checkRateLimit(
  accountId: string,
  action: Action,
): Promise<{ allowed: boolean; remaining: number }> {
  const cfg = POLICY[action];
  const result = await acquireToken({ key: `rl:${accountId}:${action}`, ...cfg });
  void db.insert(rateLimitEvents).values({ accountId, action }).catch(() => {});
  return result;
}
