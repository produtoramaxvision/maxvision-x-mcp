/**
 * Redis-backed token bucket — atomic via Lua EVALSHA (paridade LinkedIn).
 *
 * State per key (Redis hash):
 *   tokens : current token count (float, capped at `capacity`)
 *   ts     : last refill timestamp in ms
 *
 * `lazyConnect: true` defers TCP handshake until first command — server can
 * boot without Redis up (initial healthchecks + tests).
 */
import { Redis } from 'ioredis';
import { env } from '../env.js';

const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });

const LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then tokens = capacity end
if ts == nil then ts = now end

local delta = math.max(0, now - ts) / 1000
tokens = math.min(capacity, tokens + delta * refillRate)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, 3600)
return { allowed, tokens }
`;

let scriptSha: string | null = null;

async function ensureScript(): Promise<string> {
  if (scriptSha) return scriptSha;
  scriptSha = (await redis.script('LOAD', LUA)) as string;
  return scriptSha;
}

export async function acquireToken(args: {
  key: string;
  capacity: number;
  refillRate: number;
  cost?: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const { key, capacity, refillRate, cost = 1 } = args;
  const sha = await ensureScript();
  const result = (await redis.evalsha(
    sha,
    1,
    key,
    capacity,
    refillRate,
    Date.now(),
    cost,
  )) as [number, number];
  return { allowed: result[0] === 1, remaining: Math.floor(result[1]) };
}

export async function shutdownRateLimit(): Promise<void> {
  await redis.quit().catch(() => {});
}
