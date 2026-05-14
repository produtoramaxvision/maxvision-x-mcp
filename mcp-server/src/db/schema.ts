/**
 * MaxVision X MCP — Drizzle schema
 *
 * Mirrors `docker/postgres/init.sql`. When editing this file, update the SQL
 * by hand to keep DDL in sync.
 */
import {
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// accounts — multi-account cookie pool. Cookie blob: IV(12) || Tag(16) || CT.
export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    cookieEncrypted: bytea('cookie_encrypted').notNull(),
    cookieExpiresAt: timestamp('cookie_expires_at', { withTimezone: true }).notNull(),
    rateLimitBucket: jsonb('rate_limit_bucket').notNull().default(sql`'{}'::jsonb`),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_accounts_status').on(t.status)],
);

// posts_cache — TTL'd cache of X posts (read tools store here).
export const postsCache = pgTable(
  'posts_cache',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull(),
    authorHandle: text('author_handle'),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').notNull(),
    publicMetrics: jsonb('public_metrics'),
    layer: text('layer').notNull(), // 'grok' | 'x-api-v2' | 'apify' | 'patchright'
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_posts_author').on(t.authorId),
    index('idx_posts_fetched').on(t.fetchedAt),
    index('idx_posts_expires').on(t.expiresAt),
  ],
);

// users_cache — TTL'd cache of X user profiles.
export const usersCache = pgTable(
  'users_cache',
  {
    id: text('id').primaryKey(),
    handle: text('handle').notNull().unique(),
    displayName: text('display_name'),
    payload: jsonb('payload').notNull(),
    publicMetrics: jsonb('public_metrics'),
    layer: text('layer').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_users_handle').on(t.handle),
    index('idx_users_fetched').on(t.fetchedAt),
  ],
);

// engagements — track posts the user/agent has interacted with (likes/follows/replies sent).
export const engagements = pgTable(
  'engagements',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    accountId: text('account_id').notNull(),
    action: text('action').notNull(), // 'post' | 'reply' | 'quote' | 'like' | 'unlike' | 'follow' | 'unfollow' | 'dm'
    targetPostId: text('target_post_id'),
    targetUserId: text('target_user_id'),
    payload: jsonb('payload'),
    success: boolean('success').notNull(),
    errorMsg: text('error_msg'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_engagements_account').on(t.accountId),
    index('idx_engagements_action').on(t.action),
    index('idx_engagements_created').on(t.createdAt),
  ],
);

// audit_log — every tool call (LGPD: only SHA-256 hashes of input/output).
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tool: text('tool').notNull(),
    accountId: text('account_id'),
    inputHash: text('input_hash'),
    outputHash: text('output_hash'),
    success: boolean('success').notNull(),
    latencyMs: integer('latency_ms'),
    errorMsg: text('error_msg'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_audit_tool').on(t.tool),
    index('idx_audit_account').on(t.accountId),
    index('idx_audit_created').on(t.createdAt),
  ],
);

// rate_limit_events — historical analytics marker (Redis is the live counter).
export const rateLimitEvents = pgTable(
  'rate_limit_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    accountId: text('account_id').notNull(),
    action: text('action').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_rl_account').on(t.accountId),
    index('idx_rl_created').on(t.createdAt),
  ],
);

// captcha_events — captcha hits detected by browser pool.
export const captchaEvents = pgTable(
  'captcha_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    accountId: text('account_id').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow(),
    url: text('url'),
    payload: jsonb('payload'),
  },
);

// oauth_tokens — X API v2 OAuth 2.0 PKCE user-context tokens per account.
export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    accountId: text('account_id').primaryKey(),
    accessToken: bytea('access_token').notNull(), // encrypted same as cookies
    refreshToken: bytea('refresh_token'), // encrypted
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    scopes: jsonb('scopes').notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
);

// trends_cache — TTL'd cache of trending topics (~ 5min).
export const trendsCache = pgTable(
  'trends_cache',
  {
    woeid: integer('woeid').primaryKey(),
    payload: jsonb('payload').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
);
