import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetRepliesTreeInput } from './schemas.js';
import { xSearchConversation } from '../x-api/client.js';
import { patchrightGetReplies } from '../scrapers/patchright-x.js';
import { logger } from '../logger.js';

const LAYER_D_ENABLED = process.env['PATCHRIGHT_ENABLED'] === 'true';

const tool = withInstrumentation<z.infer<typeof XGetRepliesTreeInput>, unknown>({
  name: 'x_get_replies_tree',
  description:
    'Fetch replies tree via X API v2 search (Layer B, primary, 7-day window) with Patchright fallback (Layer D, requires PATCHRIGHT_ENABLED=true).',
  inputSchema: XGetRepliesTreeInput,
  async handler({ input }) {
    // Layer B: X API v2 search/recent — primary, ToS-clean, free
    try {
      const result = await xSearchConversation(input.conversationId, input.maxResults);
      const items = result.data ?? [];
      if (items.length > 0) {
        return {
          conversationId: input.conversationId,
          layer: 'B',
          count: items.length,
          items,
          meta: result.meta,
        };
      }
    } catch (err) {
      logger.warn({ err, conversationId: input.conversationId }, 'layer_b_fail');
    }

    // Layer D: Patchright browser fallback (opt-in, uses account cookies)
    if (!LAYER_D_ENABLED) {
      return {
        conversationId: input.conversationId,
        layer: 'B',
        count: 0,
        items: [],
        note: 'No results in 7-day window. Set PATCHRIGHT_ENABLED=true to enable Layer D fallback.',
      };
    }

    const items = await patchrightGetReplies({
      accountId: input.accountId,
      conversationId: input.conversationId,
      maxItems: input.maxResults,
    });
    return { conversationId: input.conversationId, layer: 'D', count: items.length, items };
  },
});

export async function xGetRepliesTreeTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
