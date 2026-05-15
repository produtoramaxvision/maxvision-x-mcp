/**
 * Multi-provider LLM client — `LlmProvider` abstraction.
 *
 * 2 providers supported:
 *   - `grok` — direct xAI API (default — native x_search tool, lowest latency)
 *   - `openrouter` — passthrough Grok via OpenRouter (multi-model fallback)
 *
 * Selection via env `LLM_PROVIDER=grok|openrouter` (defaults to `grok`).
 * Override model via `LLM_MODEL` (e.g. `grok-4.3`).
 *
 * invokeLlm() → Chat Completions API (/v1/chat/completions) — function calling
 * xSearch()   → Responses API (/v1/responses) — native x_search server-side tool
 *
 * xAI Responses API (2026): x_search filters are FLAT in the tool object,
 * not nested. Response text is in output[].content[].text (type: output_text).
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
  // grok-4-1-fast deprecated 2026-05-15 → grok-4.3 is current recommended fast model
  grok: 'grok-4.3',
  openrouter: 'x-ai/grok-4.3',
};

const ENDPOINTS: Record<Provider, string> = {
  grok: 'https://api.x.ai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

// xAI Responses API — used by xSearch() for native x_search tool
const XAI_RESPONSES_ENDPOINT = 'https://api.x.ai/v1/responses';
const XAI_RESPONSES_DEFAULT_MODEL = 'grok-4.3';

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
 * Calls xAI Grok via the Responses API with the native x_search tool.
 *
 * Uses /v1/responses (not /v1/chat/completions) — xAI moved x_search to the
 * Responses API in 2026. Chat Completions had live_search (now deprecated).
 *
 * Wire format: filters are FLAT in the tool object (not nested):
 *   { type: "x_search", allowed_x_handles: [...], from_date: "..." }
 *
 * Response is in output[].content[].text (type: "output_text"), not choices[].
 *
 * Always calls xAI directly — OpenRouter doesn't forward xAI-specific tools.
 */
export async function xSearch(args: {
  query: string;
  allowedHandles?: string[];
  excludedHandles?: string[];
  fromDate?: string;
  toDate?: string;
}): Promise<LlmResponse> {
  const apiKey = env.XAI_API_KEY;
  if (!apiKey) {
    throw new AppError('CONFIG_FAIL', 'XAI_API_KEY required for x_search (Layer A)');
  }

  // Filters are flat in the Responses API tool object.
  const xSearchTool: Record<string, unknown> = { type: 'x_search' };
  if (args.allowedHandles?.length) xSearchTool['allowed_x_handles'] = args.allowedHandles;
  if (args.excludedHandles?.length) xSearchTool['excluded_x_handles'] = args.excludedHandles;
  if (args.fromDate) xSearchTool['from_date'] = args.fromDate;
  if (args.toDate) xSearchTool['to_date'] = args.toDate;

  const model = env.LLM_MODEL ?? XAI_RESPONSES_DEFAULT_MODEL;

  const body = {
    model,
    input: [{ role: 'user', content: args.query }],
    tools: [xSearchTool],
  };

  logger.info(
    { model, query: args.query.slice(0, 80), tool: xSearchTool },
    'x_search_responses_api',
  );

  const res = await fetch(XAI_RESPONSES_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new AppError(
      'EXTERNAL_API_FAIL',
      `grok Responses API ${res.status}: ${errBody.slice(0, 300)}`,
      { provider: 'grok', status: res.status },
    );
  }

  const json = (await res.json()) as Record<string, unknown>;

  // Responses API: output[{type:"message", content:[{type:"output_text", text:"..."}]}]
  const output = json['output'] as Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }> | undefined;
  const message = output?.find(o => o.type === 'message');
  const textContent = message?.content?.find(c => c.type === 'output_text');
  const text = textContent?.text ?? '';

  return { text, raw: json };
}
