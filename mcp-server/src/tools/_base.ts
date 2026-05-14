/**
 * tools/_base — instrumentation wrapper for X MCP tools.
 *
 * withInstrumentation:
 *   1. Re-validates input via Zod schema (idempotent over SDK pre-parse).
 *   2. License gate (tier check per X-MaxVision-License header).
 *   3. Rate limit gate (Redis token bucket per accountId + action).
 *   4. Execute handler, capture latency.
 *   5. Record audit_log row (SHA-256 hashes only — LGPD).
 *   6. Map thrown errors to MCP CallToolResult error envelope.
 *
 * Audit insert is fire-and-forget — never blocks the tool response.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';
import { logger } from '../logger.js';
import { checkRateLimit, type Action } from '../rate-limit/strategy.js';
import { AppError } from '../errors.js';
import { gateToolByLicense } from '../auth/license.js';
import { getRequestContext } from '../auth/request-context.js';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

export interface ToolHandlerArgs<I> {
  input: I;
  accountId: string;
}

export interface InstrumentedTool<I, O> {
  name: Action;
  description: string;
  inputSchema: z.ZodType<I, z.ZodTypeDef, unknown>;
  handler: (args: ToolHandlerArgs<I>) => Promise<O>;
}

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export function withInstrumentation<I, O>(
  tool: InstrumentedTool<I, O>,
): (rawInput: unknown) => Promise<McpToolResult> {
  return async function wrapped(rawInput: unknown): Promise<McpToolResult> {
    const startedAt = Date.now();
    let success = false;
    let errorMsg: string | null = null;
    let outputJson = '';
    let accountId = 'default';

    try {
      const parsedInput = tool.inputSchema.parse(rawInput);
      accountId = (parsedInput as { accountId?: string }).accountId ?? 'default';

      const reqCtx = getRequestContext();
      const licenseDeny = await gateToolByLicense(tool.name, reqCtx.licenseKey);
      if (licenseDeny) {
        throw new AppError('UPSTREAM_FAIL', licenseDeny, { tool: tool.name });
      }

      const rl = await checkRateLimit(accountId, tool.name);
      if (!rl.allowed) {
        throw new AppError('RATE_LIMITED', `Rate limit exceeded for ${tool.name}`, {
          remaining: rl.remaining,
        });
      }

      const out = await tool.handler({ input: parsedInput, accountId });
      outputJson = JSON.stringify(out);
      success = true;

      return { content: [{ type: 'text', text: outputJson }] };
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      const code = err instanceof AppError ? err.code : 'UNKNOWN';
      logger.error({ tool: tool.name, accountId, code, err: errorMsg }, 'tool error');
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: { code, message: errorMsg } }),
          },
        ],
      };
    } finally {
      const latencyMs = Date.now() - startedAt;
      const inputHash = sha256(JSON.stringify(rawInput ?? null));
      const outputHash = outputJson ? sha256(outputJson) : null;
      void db
        .insert(auditLog)
        .values({
          tool: tool.name,
          accountId,
          inputHash,
          outputHash,
          success,
          latencyMs,
          errorMsg,
        })
        .catch((e: unknown) => logger.warn({ err: e }, 'audit_log insert failed'));
    }
  };
}
