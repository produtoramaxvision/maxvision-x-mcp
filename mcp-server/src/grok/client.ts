/**
 * Grok client wrapper — Layer A read.
 *
 * Re-exports the canonical `xSearch` from auth/llm-provider for tools that
 * want a slim API surface without coupling to the LLM abstraction directly.
 */
export { xSearch, invokeLlm } from '../auth/llm-provider.js';
export type { LlmInvokeArgs } from '../auth/llm-provider.js';
