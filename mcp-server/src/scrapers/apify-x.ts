/**
 * Apify Tweet Scraper V2 (apidojo) — Layer C bulk reads.
 *
 * $0.25/1k tweets — cheapest reliable backstop for read jobs >1k tweets/call
 * where Layer A (Grok) or B (X API v2 pay-per-use) would exceed budget.
 *
 * Actor: `apidojo/tweet-scraper`
 * Docs: https://apify.com/apidojo/tweet-scraper
 */
import { env } from '../env.js';
import { logger } from '../logger.js';
import { AppError } from '../errors.js';

const APIFY_BASE = 'https://api.apify.com/v2';
const TWEET_SCRAPER_ACTOR = 'apidojo~tweet-scraper';

interface ApifyRunInput {
  searchTerms?: string[];
  twitterHandles?: string[];
  conversationIds?: string[];
  maxItems?: number;
  sort?: 'Latest' | 'Top';
  tweetLanguage?: string;
  start?: string; // ISO date
  end?: string;
}

interface ApifyDataset {
  data: { items: unknown[] };
}

export async function apifyRunTweetScraper(
  input: ApifyRunInput,
): Promise<unknown[]> {
  if (!env.APIFY_API_TOKEN) {
    throw new AppError('CONFIG_FAIL', 'APIFY_API_TOKEN unset');
  }

  const url = `${APIFY_BASE}/acts/${TWEET_SCRAPER_ACTOR}/run-sync-get-dataset-items?token=${env.APIFY_API_TOKEN}`;

  logger.info(
    { actor: TWEET_SCRAPER_ACTOR, maxItems: input.maxItems },
    'apify_run',
  );

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new AppError(
      'EXTERNAL_API_FAIL',
      `Apify ${res.status}: ${errBody.slice(0, 300)}`,
      { status: res.status },
    );
  }

  // run-sync-get-dataset-items returns the items array directly.
  const items = (await res.json()) as unknown[];
  return items;
}

export async function apifySearchPosts(args: {
  searchTerms: string[];
  maxItems?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<unknown[]> {
  return apifyRunTweetScraper({
    searchTerms: args.searchTerms,
    maxItems: args.maxItems ?? 100,
    sort: 'Latest',
    ...(args.fromDate && { start: args.fromDate }),
    ...(args.toDate && { end: args.toDate }),
  });
}

export async function apifyUserTimeline(args: {
  handle: string;
  maxItems?: number;
}): Promise<unknown[]> {
  return apifyRunTweetScraper({
    twitterHandles: [args.handle],
    maxItems: args.maxItems ?? 100,
    sort: 'Latest',
  });
}

export async function apifyConversationThread(args: {
  conversationId: string;
  maxItems?: number;
}): Promise<unknown[]> {
  return apifyRunTweetScraper({
    conversationIds: [args.conversationId],
    maxItems: args.maxItems ?? 200,
  });
}
