/**
 * Layer D — Patchright reply scraper.
 * Intercepts TweetDetail GraphQL responses from x.com.
 */
import { createAccountContext } from '../browser/context.js';
import { randomDelay } from '../browser/anti-detect.js';
import { logger } from '../logger.js';

export interface PatchrightTweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export async function patchrightGetReplies(args: {
  accountId: string;
  conversationId: string;
  maxItems?: number;
}): Promise<PatchrightTweet[]> {
  const max = args.maxItems ?? 100;
  const collected: PatchrightTweet[] = [];

  const context = await createAccountContext(args.accountId);
  try {
    const page = await context.newPage();

    page.on('response', async (response) => {
      if (!response.url().includes('TweetDetail')) return;
      if (collected.length >= max) return;
      try {
        const json = (await response.json()) as Record<string, unknown>;
        const instructions =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (json?.data as any)?.threaded_conversation_with_injections_v2?.instructions ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const inst of instructions as any[]) {
          for (const entry of inst.entries ?? []) {
            const result = entry?.content?.itemContent?.tweet_results?.result;
            if (!result?.legacy) continue;
            const leg = result.legacy;
            collected.push({
              id: result.rest_id,
              text: leg.full_text ?? '',
              author_id: leg.user_id_str ?? '',
              created_at: leg.created_at,
              public_metrics:
                leg.favorite_count !== undefined
                  ? {
                      retweet_count: leg.retweet_count ?? 0,
                      reply_count: leg.reply_count ?? 0,
                      like_count: leg.favorite_count ?? 0,
                      quote_count: leg.quote_count ?? 0,
                    }
                  : undefined,
            });
            if (collected.length >= max) break;
          }
        }
      } catch {}
    });

    await page.goto(`https://x.com/i/web/status/${args.conversationId}`, {
      waitUntil: 'load',
      timeout: 30_000,
    });
    await randomDelay(2000, 3500);
    await page.close();
  } finally {
    await context.close();
  }

  logger.info(
    { accountId: args.accountId, conversationId: args.conversationId, count: collected.length },
    'layer_d_replies_scraped',
  );
  return collected.slice(0, max);
}
