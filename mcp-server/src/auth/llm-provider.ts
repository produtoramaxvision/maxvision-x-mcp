/**
 * Multi-provider LLM client — `LlmProvider` abstraction.
 *
 * 2 providers supported (T2 decision Sprint 1):
 *   - `grok` — direct xAI API (default — native x_search tool, lowest latency)
 *   - `openrouter` — passthrough Grok via OpenRouter (multi-model fallback)
 *
 * Selection via env `LLM_PROVIDER=grok|openrouter` (defaults to `grok`).
 * Override model via `LLM_MODEL` (e.g. `grok-4-1-fast-non-reasoning`).
 *
 * Both providers expose:
 *   - chat completion with optional tools (function calling)
 *   - x_search native tool (Grok direct) or passthrough (OpenRouter w/ tools)
 *
 * For semantic post search use `xSearch()` (calls Grok with `x_search` tool
 * registered). For free-form LLM use `invokeLlm()`.
 */
import { env } from '../env.js';
import { logger } from '../logger.js';
import { AppError } from '../errors.js';

type Provider = 'grok' | 'openrouter';

interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  endpoint: string;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  // xAI Grok 4.1 Fast (non-reasoning) — replaces `grok-4-fast` deprecated 2026-05-15
  grok: 'grok-4-1-fast-non-reasoning',
  openrouter: 'x-ai/grok-4.1-fast',
};

const ENDPOINTS: Record<Provider, string> = {
  grok: 'https://api.x.ai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

function resolveProvider(): ProviderConfig {
  const explicit = env.LLM_PROVIDER;
  const userModel = env.LLM_MODEL;

  if (explicit === 'grok') {
    const key = env.XAI_API_KEY;
    if (!key) throw new AppError('CONFIG_FAIL', 'LLM_PROVIDER=grok but XAI_API_KEY unset');
    return {
      provider: 'grok',
      apiKey: key,
      model: userModel ?? DEFAULT_MODELS.grok,
      endpoint: ENDPOINTS.grok,
    };
  }
  if (explicit === 'openrouter') {
    const key = env.OPENROUTER_API_KEY;
    if (!key) throw new AppError('CONFIG_FAIL', 'LLM_PROVIDER=openrouter but OPENROUTER_API_KEY unset');
    return {
      provider: 'openrouter',
      apiKey: key,
      model: userModel ?? DEFAULT_MODELS.openrouter,
      endpoint: ENDPOINTS.openrouter,
    };
  }

  throw new AppError(
    'CONFIG_FAIL',
    'No LLM provider configured — set XAI_API_KEY or OPENROUTER_API_KEY',
  );
}

export interface LlmInvokeArgs {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

interface LlmResponse {
  text: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  raw: unknown;
}

export async function invokeLlm(args: LlmInvokeArgs): Promise<LlmResponse> {
  const cfg = resolveProvider();
  const maxTokens = args.maxTokens ?? 4096;
  const temperature = args.temperature ?? 0.4;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (args.systemPrompt) messages.push({ role: 'system', content: args.systemPrompt });
  messages.push({ role: 'user', content: args.userPrompt });

  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: maxTokens,
    temperature,
    messages,
  };
  if (args.tools) body['tools'] = args.tools;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${cfg.apiKey}`,
  };
  if (cfg.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://x.produtoramaxvision.com.br';
    headers['X-Title'] = 'MaxVision X Suite';
  }

  logger.info(
    { provider: cfg.provider, model: cfg.model, maxTokens, tools: args.tools?.length ?? 0 },
    'invoke_llm',
  );

  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new AppError(
      'EXTERNAL_API_FAIL',
      `${cfg.provider} API ${res.status}: ${errBody.slice(0, 300)}`,
      { provider: cfg.provider, status: res.status },
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  const choices = json['choices'] as Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        function: { name: string; arguments: string };
      }>;
    };
  }> | undefined;
  const msg = choices?.[0]?.message;
  const text = msg?.content ?? '';
  const toolCalls = msg?.tool_calls?.map((tc) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    } catch {
      // bad JSON from LLM — leave empty
    }
    return { name: tc.function.name, arguments: parsed };
  });

  const response: LlmResponse = { text, raw: json };
  if (toolCalls && toolCalls.length > 0) {
    response.toolCalls = toolCalls;
  }
  return response;
}

/**
 * Convenience wrapper to invoke Grok with native `x_search` tool registered.
 * Used by Layer A read tools (x_search_posts, x_profile_activity).
 *
 * Returns the raw Grok response — caller parses tool_calls + x_search results.
 */
export async function xSearch(args: {
  query: string;
  allowedHandles?: string[];
  excludedHandles?: string[];
  fromDate?: string;
  toDate?: string;
  mode?: 'on' | 'off' | 'auto';
}): Promise<LlmResponse> {
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'x_search',
        description: 'Search posts on X (Twitter). Use for any X-specific content lookup.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            allowed_x_handles: { type: 'array', items: { type: 'string' } },
            excluded_x_handles: { type: 'array', items: { type: 'string' } },
            from_date: { type: 'string', description: 'YYYY-MM-DD' },
            to_date: { type: 'string', description: 'YYYY-MM-DD' },
          },
          required: ['query'],
        },
      },
    },
  ];

  const params = {
    query: args.query,
    ...(args.allowedHandles && { allowed_x_handles: args.allowedHandles }),
    ...(args.excludedHandles && { excluded_x_handles: args.excludedHandles }),
    ...(args.fromDate && { from_date: args.fromDate }),
    ...(args.toDate && { to_date: args.toDate }),
  };

  return invokeLlm({
    userPrompt: `Use x_search with parameters: ${JSON.stringify(params)}`,
    tools,
    temperature: 0,
  });
}
