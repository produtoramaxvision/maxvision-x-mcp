-- ============================================================
-- MaxVision X MCP — Postgres bootstrap schema
-- ============================================================
-- This file is the source-of-truth applied by `docker-entrypoint-initdb.d/`
-- on first container boot. After that, Drizzle migrations take over via
-- `pnpm db:migrate` (server.ts runs migrate-with-retry on startup).
--
-- Mirror of `src/db/schema.ts` — keep in sync by hand.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- accounts ----------
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  cookie_encrypted bytea NOT NULL,
  cookie_expires_at timestamptz NOT NULL,
  rate_limit_bucket jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- ---------- posts_cache ----------
CREATE TABLE IF NOT EXISTS posts_cache (
  id text PRIMARY KEY,
  author_id text NOT NULL,
  author_handle text,
  text text NOT NULL,
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  public_metrics jsonb,
  layer text NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts_cache(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_fetched ON posts_cache(fetched_at);
CREATE INDEX IF NOT EXISTS idx_posts_expires ON posts_cache(expires_at);

-- ---------- users_cache ----------
CREATE TABLE IF NOT EXISTS users_cache (
  id text PRIMARY KEY,
  handle text NOT NULL UNIQUE,
  display_name text,
  payload jsonb NOT NULL,
  public_metrics jsonb,
  layer text NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users_cache(handle);
CREATE INDEX IF NOT EXISTS idx_users_fetched ON users_cache(fetched_at);

-- ---------- engagements ----------
CREATE TABLE IF NOT EXISTS engagements (
  id bigserial PRIMARY KEY,
  account_id text NOT NULL,
  action text NOT NULL,
  target_post_id text,
  target_user_id text,
  payload jsonb,
  success boolean NOT NULL,
  error_msg text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engagements_account ON engagements(account_id);
CREATE INDEX IF NOT EXISTS idx_engagements_action ON engagements(action);
CREATE INDEX IF NOT EXISTS idx_engagements_created ON engagements(created_at);

-- ---------- audit_log ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  tool text NOT NULL,
  account_id text,
  input_hash text,
  output_hash text,
  success boolean NOT NULL,
  latency_ms integer,
  error_msg text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool);
CREATE INDEX IF NOT EXISTS idx_audit_account ON audit_log(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ---------- rate_limit_events ----------
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id bigserial PRIMARY KEY,
  account_id text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rl_account ON rate_limit_events(account_id);
CREATE INDEX IF NOT EXISTS idx_rl_created ON rate_limit_events(created_at);

-- ---------- captcha_events ----------
CREATE TABLE IF NOT EXISTS captcha_events (
  id bigserial PRIMARY KEY,
  account_id text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  url text,
  payload jsonb
);

-- ---------- oauth_tokens ----------
CREATE TABLE IF NOT EXISTS oauth_tokens (
  account_id text PRIMARY KEY,
  access_token bytea NOT NULL,
  refresh_token bytea,
  expires_at timestamptz NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------- trends_cache ----------
CREATE TABLE IF NOT EXISTS trends_cache (
  woeid integer PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
