/**
 * X API v2 client — Layer B (writes + cirurgical reads).
 *
 * Uses pay-per-use OAuth 2.0 PKCE user-context bearer token stored in
 * `oauth_tokens` table (encrypted same as cookies).
 *
 * For Sprint 1 minimal viable: supports App-Only Bearer for read endpoints
 * (`X_API_BEARER_TOKEN` env). Full OAuth 2.0 PKCE user-context flow lands
 * via /admin/oauth-callback handler in Sprint 1.5.
 */
import { env } from '../env.js';
import { logger } from '../logger.js';
import { AppError } from '../errors.js';
import { db } from '../db/client.js';
import { oauthTokens } from '../db/schema.js';
import { decryptCookie, encryptCookie } from '../auth/cookies.js';
import { eq } from 'drizzle-orm';

const X_API_BASE = 'https://api.x.com/2';

interface XApiOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  body?: unknown;
  accountId?: string; // For user-context endpoints; omits = App-Only Bearer
  query?: Record<string, string | number | undefined>;
}

async function refreshAccessToken(
  accountId: string,
  refreshTokenEncrypted: Buffer,
): Promise<string> {
  const clientId = env.X_API_CLIENT_ID;
  const clientSecret = env.X_API_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AppError('CONFIG_FAIL', 'X_API_CLIENT_ID/SECRET required for token refresh');
  }
  const refreshToken = decryptCookie(refreshTokenEncrypted);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, accountId, body: body.slice(0, 200) }, 'oauth_refresh_fail');
    throw new AppError('AUTH_FAIL', `Token refresh failed (${res.status}). Re-authorize via /x-oauth-connect.`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  const expiresAt = new Date(Date.now() + json.expires_in * 1000);
  const accessEnc = encryptCookie(json.access_token);
  const refreshEnc = json.refresh_token ? encryptCookie(json.refresh_token) : refreshTokenEncrypted;
  await db
    .update(oauthTokens)
    .set({ accessToken: accessEnc, refreshToken: refreshEnc, expiresAt, updatedAt: new Date() })
    .where(eq(oauthTokens.accountId, accountId));
  logger.info({ accountId, expiresAt }, 'oauth_token_refreshed');
  return json.access_token;
}

async function getAccessToken(accountId: string): Promise<string> {
  const row = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.accountId, accountId))
    .limit(1);
  const tok = row[0];
  if (!tok) {
    throw new AppError(
      'AUTH_FAIL',
      `No OAuth token for account "${accountId}". Run /x-oauth-connect first.`,
    );
  }
  // Refresh proactively 5 minutes before expiry
  if (new Date(tok.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    if (!tok.refreshToken) {
      throw new AppError(
        'AUTH_FAIL',
        `OAuth token expired at ${tok.expiresAt.toISOString()} and no refresh token available. Re-authorize via /x-oauth-connect.`,
      );
    }
    return refreshAccessToken(accountId, tok.refreshToken);
  }
  return decryptCookie(tok.accessToken);
}

export async function xApiRequest<T>(
  path: string,
  opts: XApiOptions = {},
): Promise<T> {
  const url = new URL(X_API_BASE + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  let token: string;
  if (opts.accountId) {
    token = await getAccessToken(opts.accountId);
  } else {
    const bearer = env.X_API_BEARER_TOKEN;
    if (!bearer) {
      throw new AppError(
        'CONFIG_FAIL',
        'X_API_BEARER_TOKEN unset and no accountId provided',
      );
    }
    token = bearer;
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const res = await fetch(url, init);
  if (!res.ok) {
    const errBody = await res.text();
    logger.error(
      { status: res.status, path, accountId: opts.accountId, body: errBody.slice(0, 300) },
      'x_api_error',
    );
    throw new AppError(
      'EXTERNAL_API_FAIL',
      `X API ${res.status}: ${errBody.slice(0, 300)}`,
      { status: res.status, path },
    );
  }
  return (await res.json()) as T;
}

// Convenience typed helpers

export interface XPost {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  referenced_tweets?: Array<{ type: string; id: string }>;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  profile_image_url?: string;
  verified?: boolean;
}

export async function xSearchConversation(
  conversationId: string,
  max = 100,
): Promise<{ data: XPost[]; meta?: { newest_id: string; oldest_id: string; result_count: number; next_token?: string } }> {
  return xApiRequest('/tweets/search/recent', {
    query: {
      query: `conversation_id:${conversationId}`,
      max_results: Math.min(max, 100),
      'tweet.fields': 'author_id,created_at,public_metrics,referenced_tweets,in_reply_to_user_id',
      expansions: 'author_id',
      'user.fields': 'username,name',
    },
  });
}

export async function xGetPost(id: string): Promise<{ data: XPost }> {
  return xApiRequest(`/tweets/${id}`, {
    query: {
      'tweet.fields': 'author_id,created_at,public_metrics,referenced_tweets',
    },
  });
}

export async function xGetUser(username: string): Promise<{ data: XUser }> {
  return xApiRequest(`/users/by/username/${encodeURIComponent(username)}`, {
    query: {
      'user.fields': 'description,public_metrics,profile_image_url,verified',
    },
  });
}

export async function xGetUserTimeline(
  userId: string,
  max = 25,
): Promise<{ data: XPost[] }> {
  return xApiRequest(`/users/${userId}/tweets`, {
    query: {
      max_results: max,
      'tweet.fields': 'created_at,public_metrics,referenced_tweets',
    },
  });
}

export async function xGetFollowers(
  userId: string,
  max = 100,
): Promise<{ data: XUser[] }> {
  return xApiRequest(`/users/${userId}/followers`, {
    query: { max_results: max, 'user.fields': 'public_metrics' },
  });
}

export async function xGetFollowing(
  userId: string,
  max = 100,
): Promise<{ data: XUser[] }> {
  return xApiRequest(`/users/${userId}/following`, {
    query: { max_results: max, 'user.fields': 'public_metrics' },
  });
}

// Writes (require user-context OAuth)

export async function xPostTweet(args: {
  accountId: string;
  text: string;
  replyToId?: string;
  quoteId?: string;
  mediaIds?: string[];
}): Promise<{ data: { id: string; text: string } }> {
  const body: Record<string, unknown> = { text: args.text };
  if (args.replyToId) body['reply'] = { in_reply_to_tweet_id: args.replyToId };
  if (args.quoteId) body['quote_tweet_id'] = args.quoteId;
  if (args.mediaIds && args.mediaIds.length > 0) {
    body['media'] = { media_ids: args.mediaIds };
  }
  return xApiRequest('/tweets', {
    method: 'POST',
    body,
    accountId: args.accountId,
  });
}

export async function xLike(args: {
  accountId: string;
  userId: string;
  tweetId: string;
  unlike?: boolean;
}): Promise<{ data: { liked: boolean } }> {
  if (args.unlike) {
    return xApiRequest(`/users/${args.userId}/likes/${args.tweetId}`, {
      method: 'DELETE',
      accountId: args.accountId,
    });
  }
  return xApiRequest(`/users/${args.userId}/likes`, {
    method: 'POST',
    body: { tweet_id: args.tweetId },
    accountId: args.accountId,
  });
}

export async function xFollow(args: {
  accountId: string;
  userId: string;
  targetUserId: string;
  unfollow?: boolean;
}): Promise<{ data: { following: boolean; pending_follow?: boolean } }> {
  if (args.unfollow) {
    return xApiRequest(`/users/${args.userId}/following/${args.targetUserId}`, {
      method: 'DELETE',
      accountId: args.accountId,
    });
  }
  return xApiRequest(`/users/${args.userId}/following`, {
    method: 'POST',
    body: { target_user_id: args.targetUserId },
    accountId: args.accountId,
  });
}

export async function xSendDm(args: {
  accountId: string;
  recipientId: string;
  text: string;
}): Promise<{ data: { dm_conversation_id: string; dm_event_id: string } }> {
  return xApiRequest(`/dm_conversations/with/${args.recipientId}/messages`, {
    method: 'POST',
    body: { text: args.text },
    accountId: args.accountId,
  });
}
