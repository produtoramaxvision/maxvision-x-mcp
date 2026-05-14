import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  MASTER_KEY: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]+$/, 'MASTER_KEY must be 64 hex chars (32 bytes)'),
  MCP_PORT: z.coerce.number().int().positive().default(3000),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  MCP_API_KEYS: z
    .string()
    .optional()
    .default('')
    .transform((s) => s.split(',').map((k) => k.trim()).filter(Boolean)),
  // xAI Grok (Layer A) — direct
  XAI_API_KEY: z.string().optional(),
  // OpenRouter (Layer A passthrough alternative)
  OPENROUTER_API_KEY: z.string().optional(),
  // X API v2 (Layer B writes + cirurgical reads)
  X_API_BEARER_TOKEN: z.string().optional(),
  X_API_CLIENT_ID: z.string().optional(),
  X_API_CLIENT_SECRET: z.string().optional(),
  // Apify (Layer C bulk reads)
  APIFY_API_TOKEN: z.string().optional(),
  // LLM provider preference
  LLM_PROVIDER: z.enum(['grok', 'openrouter']).default('grok'),
  LLM_MODEL: z.string().optional(),
  // License gating
  LICENSE_CHECK_ENABLED: z.string().optional().default('false'),
  LICENSE_SERVER_URL: z
    .string()
    .url()
    .default('https://x-license.produtoramaxvision.com.br'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
